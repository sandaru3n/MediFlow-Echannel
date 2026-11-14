"use client";

// A small in-browser stand-in for the Supabase client, used when no Supabase project is configured.
// It mirrors the parts of the API the app uses and the access rules from the RLS migration.

import { doctorIdOf, getDb, getSessionUserId, hasRole, saveDb, setSessionUserId, uuid } from "./store";
import { doctorSlots, nextSlots } from "./slots";
import { samplePdf } from "./pdf";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const denied = { code: "42501", message: "permission denied" };
const looksLikeTimestamp = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v);

// ---------------------------------------------------------------------------
// Access rules (mirror of 20261114000003_rls.sql)
// ---------------------------------------------------------------------------

function canRead(table, row, uid) {
  const admin = uid && hasRole(uid, "admin");
  const myDoc = uid && doctorIdOf(uid);
  switch (table) {
    case "profiles":
    case "user_roles":
      return admin || (row.id ?? row.user_id) === uid || row.user_id === uid;
    case "doctors":
      return row.active || (uid && row.user_id === uid) || admin;
    case "blocked_dates":
      return admin || (myDoc && row.doctor_id === myDoc);
    case "appointments":
      return admin || (uid && row.patient_id === uid) || (myDoc && row.doctor_id === myDoc);
    case "lab_reports": {
      if (admin || (uid && (row.patient_id === uid || row.uploaded_by === uid))) return true;
      const a = row.appointment_id && getDb().appointments.find((x) => x.id === row.appointment_id);
      return !!(myDoc && a && a.doctor_id === myDoc);
    }
    case "contact_messages":
      return admin;
    case "credentials":
      return false;
    default:
      return true;
  }
}

function canWrite(table, op, row, uid) {
  if (!uid) return false;
  const admin = hasRole(uid, "admin");
  const myDoc = doctorIdOf(uid);
  switch (table) {
    case "specialties":
    case "hospitals":
    case "doctors":
    case "appointments":
      return admin;
    case "availability":
    case "blocked_dates":
      return admin || (myDoc && row.doctor_id === myDoc);
    case "lab_reports":
      if (op === "insert") return row.uploaded_by === uid && (admin || hasRole(uid, "doctor"));
      if (op === "delete") return admin || row.uploaded_by === uid;
      return admin;
    case "user_roles":
      if (op === "insert") return admin;
      if (op === "delete") return admin && row.user_id !== uid;
      return false;
    case "profiles":
      return op === "update" && (admin || row.id === uid);
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Constraints & triggers
// ---------------------------------------------------------------------------

const UNIQUE = {
  specialties: [["name_en"]],
  hospitals: [["name", "district"]],
  lab_reports: [["invoice_number"], ["file_path"]],
  blocked_dates: [["doctor_id", "blocked_on"]],
  user_roles: [["user_id", "role"]],
  doctors: [["user_id"]],
};

function uniqueViolation(table, row, rows) {
  return (UNIQUE[table] ?? []).some((cols) =>
    rows.some((o) => o.id !== row.id && cols.every((c) => row[c] != null && o[c] === row[c])),
  );
}

function beforeInsert(table, row) {
  const db = getDb();
  const base = { id: uuid(), created_at: new Date().toISOString(), ...row };
  if (table === "doctors") return { active: true, experience_years: 0, fee: 0, bio: null, photo_url: null, user_id: null, ...base };
  if (table === "lab_reports") {
    base.invoice_number = String(base.invoice_number).toUpperCase();
    if (!base.patient_id) {
      const p = db.profiles.find(
        (x) => (base.patient_phone && x.phone === base.patient_phone) || (base.patient_email && x.email && x.email.toLowerCase() === base.patient_email.toLowerCase()),
      );
      base.patient_id = p?.id ?? null;
    }
  }
  return base;
}

function onDelete(table, row) {
  const db = getDb();
  if ((table === "hospitals" || table === "specialties") && db.doctors.some((d) => d[table === "hospitals" ? "hospital_id" : "specialty_id"] === row.id)) {
    return { code: "23503", message: "violates foreign key constraint" };
  }
  if (table === "doctors") {
    const apptIds = new Set(db.appointments.filter((a) => a.doctor_id === row.id).map((a) => a.id));
    db.availability = db.availability.filter((a) => a.doctor_id !== row.id);
    db.blocked_dates = db.blocked_dates.filter((b) => b.doctor_id !== row.id);
    db.appointments = db.appointments.filter((a) => a.doctor_id !== row.id);
    db.lab_reports.forEach((r) => apptIds.has(r.appointment_id) && (r.appointment_id = null));
  }
  return null;
}

// ---------------------------------------------------------------------------
// Embedded relations (select("…, specialty:specialties(…)") etc.)
// ---------------------------------------------------------------------------

function expandDoctor(d) {
  const db = getDb();
  return { ...d, specialty: db.specialties.find((s) => s.id === d.specialty_id) ?? null, hospital: db.hospitals.find((h) => h.id === d.hospital_id) ?? null };
}

function expand(table, row, cols) {
  if (table === "doctors" && /specialty:|hospital:/.test(cols)) return expandDoctor(row);
  if (table === "appointments" && cols.includes("doctor:")) {
    const d = getDb().doctors.find((x) => x.id === row.doctor_id);
    return { ...row, doctor: d ? expandDoctor(d) : null };
  }
  return row;
}

// ---------------------------------------------------------------------------
// Query builder
// ---------------------------------------------------------------------------

class Query {
  constructor(table) {
    this.table = table;
    this.op = "select";
    this.cols = "*";
    this.filters = [];
    this.orders = [];
    this.max = null;
    this.mode = null;
    this.returning = false;
  }
  select(cols = "*", opts = {}) {
    if (this.op === "select") {
      this.cols = cols;
      this.countOpt = opts;
    } else {
      this.returning = true;
      this.cols = cols;
    }
    return this;
  }
  insert(rows) {
    this.op = "insert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  update(values) {
    this.op = "update";
    this.payload = values;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(col, val) {
    this.filters.push((r) => String(r[col]) === String(val));
    return this;
  }
  in(col, vals) {
    const set = new Set(vals.map(String));
    this.filters.push((r) => set.has(String(r[col])));
    return this;
  }
  gte(col, val) {
    this.filters.push((r) => (looksLikeTimestamp(val) && looksLikeTimestamp(r[col]) ? new Date(r[col]) >= new Date(val) : String(r[col]) >= String(val)));
    return this;
  }
  order(col, { ascending = true } = {}) {
    this.orders.push([col, ascending ? 1 : -1]);
    return this;
  }
  limit(n) {
    this.max = n;
    return this;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  then(resolve, reject) {
    return this.run().then(resolve, reject);
  }

  async run() {
    await sleep(120);
    const db = getDb();
    const uid = getSessionUserId();
    const rows = db[this.table];
    if (!rows || this.table === "credentials") return { data: null, error: { code: "42P01", message: "relation does not exist" } };
    const match = (r) => this.filters.every((f) => f(r));

    if (this.op === "insert") {
      const created = [];
      for (const raw of this.payload) {
        const row = beforeInsert(this.table, raw);
        if (!canWrite(this.table, "insert", row, uid)) return { data: null, error: denied };
        if (uniqueViolation(this.table, row, rows)) return { data: null, error: { code: "23505", message: "duplicate key value" } };
        created.push(row);
      }
      rows.push(...created);
      saveDb();
      return this.finish(this.returning ? created : null);
    }

    if (this.op === "update") {
      const targets = rows.filter((r) => match(r) && canRead(this.table, r, uid));
      if (targets.some((r) => !canWrite(this.table, "update", r, uid))) return { data: null, error: denied };
      for (const r of targets) {
        const next = { ...r, ...this.payload };
        if (uniqueViolation(this.table, next, rows)) return { data: null, error: { code: "23505", message: "duplicate key value" } };
      }
      targets.forEach((r) => Object.assign(r, this.payload, { updated_at: new Date().toISOString() }));
      saveDb();
      return this.finish(this.returning ? targets : null);
    }

    if (this.op === "delete") {
      const targets = rows.filter((r) => match(r) && canRead(this.table, r, uid));
      if (targets.some((r) => !canWrite(this.table, "delete", r, uid))) return { data: null, error: denied };
      for (const r of targets) {
        const err = onDelete(this.table, r);
        if (err) return { data: null, error: err };
      }
      const gone = new Set(targets);
      db[this.table] = db[this.table].filter((r) => !gone.has(r));
      saveDb();
      return this.finish(null);
    }

    let out = rows.filter((r) => canRead(this.table, r, uid) && match(r));
    if (this.countOpt?.head) return { data: null, count: out.length, error: null };
    for (const [col, dir] of [...this.orders].reverse()) {
      out = [...out].sort((a, b) => {
        const x = a[col];
        const y = b[col];
        if (x == null) return 1;
        if (y == null) return -1;
        const cmp = looksLikeTimestamp(x) && looksLikeTimestamp(y) ? new Date(x) - new Date(y) : typeof x === "number" ? x - y : String(x).localeCompare(String(y));
        return cmp * dir;
      });
    }
    if (this.max != null) out = out.slice(0, this.max);
    return this.finish(out);
  }

  finish(list) {
    if (list === null) return { data: null, error: null };
    const data = clone(list.map((r) => expand(this.table, r, this.cols)));
    if (this.mode === "maybe") return { data: data[0] ?? null, error: null };
    if (this.mode === "single") return data.length === 1 ? { data: data[0], error: null } : { data: null, error: { code: "PGRST116", message: "no rows" } };
    return { data, error: null, count: data.length };
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const listeners = new Set();
const tokens = new Map();

export function userObject(uid) {
  if (!uid) return null;
  const db = getDb();
  const p = db.profiles.find((x) => x.id === uid);
  if (!p) return null;
  const cred = db.credentials.find((c) => c.user_id === uid);
  return { id: uid, email: p.email ?? cred?.email ?? undefined, phone: p.phone ?? undefined, app_metadata: {}, user_metadata: { full_name: p.full_name } };
}

function emit(event) {
  const user = userObject(getSessionUserId());
  setTimeout(() => listeners.forEach((cb) => cb(event, user ? { user } : null)), 0);
}

/** One-time exchange token (stands in for the magic-link token hash the real server returns). */
export function issueToken(uid) {
  const t = uuid();
  tokens.set(t, uid);
  return t;
}

const auth = {
  async getUser() {
    return { data: { user: userObject(getSessionUserId()) }, error: null };
  },
  async getSession() {
    const user = userObject(getSessionUserId());
    return { data: { session: user ? { user } : null }, error: null };
  },
  onAuthStateChange(cb) {
    listeners.add(cb);
    return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
  },
  async signInWithPassword({ email, password }) {
    await sleep(300);
    const cred = getDb().credentials.find((c) => c.email === String(email).trim().toLowerCase() && c.password === password);
    if (!cred) return { data: { user: null, session: null }, error: { message: "Invalid login credentials", code: "invalid_credentials" } };
    setSessionUserId(cred.user_id);
    emit("SIGNED_IN");
    return { data: { user: userObject(cred.user_id) }, error: null };
  },
  async verifyOtp({ token_hash }) {
    const uid = tokens.get(token_hash);
    if (!uid) return { data: { user: null }, error: { message: "Token has expired or is invalid" } };
    tokens.delete(token_hash);
    setSessionUserId(uid);
    emit("SIGNED_IN");
    return { data: { user: userObject(uid) }, error: null };
  },
  async signOut() {
    setSessionUserId(null);
    emit("SIGNED_OUT");
    return { error: null };
  },
};

// ---------------------------------------------------------------------------
// Storage (private "lab-reports" bucket)
// ---------------------------------------------------------------------------

const files = new Map();

/** Blob URL for a report: the uploaded file if this tab still has it, otherwise a generated sample PDF. */
export function reportUrl(report) {
  const blob =
    files.get(report.file_path) ??
    samplePdf([
      "MediFlow - Laboratory Report (DEMO)",
      `Invoice: ${report.invoice_number}`,
      `Test: ${report.test_name}`,
      `Patient: ${report.patient_name || "-"}`,
      `Issued: ${new Date(report.created_at).toLocaleString("en-GB", { timeZone: "Asia/Colombo" })}`,
      "",
      "This is sample data generated in demo mode.",
      "No real medical information is shown.",
    ]);
  return URL.createObjectURL(blob);
}

const storage = {
  from() {
    return {
      async upload(path, file) {
        const uid = getSessionUserId();
        if (!uid || !(hasRole(uid, "admin") || hasRole(uid, "doctor"))) return { data: null, error: denied };
        if (files.has(path)) return { data: null, error: { message: "The resource already exists" } };
        files.set(path, file);
        return { data: { path }, error: null };
      },
      async remove(paths) {
        const uid = getSessionUserId();
        if (!uid || !hasRole(uid, "admin")) return { data: null, error: denied };
        paths.forEach((p) => files.delete(p));
        return { data: paths, error: null };
      },
      async createSignedUrl(path) {
        const uid = getSessionUserId();
        const report = getDb().lab_reports.find((r) => r.file_path === path);
        if (!report || !canRead("lab_reports", report, uid)) return { data: null, error: { message: "Object not found" } };
        return { data: { signedUrl: reportUrl(report) }, error: null };
      },
    };
  },
};

// ---------------------------------------------------------------------------
// RPCs
// ---------------------------------------------------------------------------

async function rpc(name, args = {}) {
  await sleep(150);
  const uid = getSessionUserId();
  const db = getDb();
  switch (name) {
    case "get_doctor_slots":
      return { data: doctorSlots(args.p_doctor, args.p_date), error: null };
    case "doctor_next_slots":
      return { data: nextSlots(args.p_from, args.p_days ?? 30), error: null };
    case "has_role":
      return { data: hasRole(args._user_id, args._role), error: null };
    case "admin_stats":
      if (!uid || !hasRole(uid, "admin")) return { data: null, error: { message: "forbidden" } };
      return {
        data: [
          {
            bookings: db.appointments.length,
            doctors: db.doctors.length,
            patients: new Set(db.user_roles.filter((r) => r.role === "patient").map((r) => r.user_id)).size,
            reports: db.lab_reports.length,
          },
        ],
        error: null,
      };
    default:
      return { data: null, error: { message: `function ${name} does not exist` } };
  }
}

let client;
export function getDemoClient() {
  if (!client) client = { from: (table) => new Query(table), rpc, auth, storage };
  return client;
}
