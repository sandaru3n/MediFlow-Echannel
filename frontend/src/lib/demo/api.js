"use client";

// Local versions of the /api route handlers for demo mode. Same Zod schemas and error codes as the server.

import { z } from "zod";
import {
  appointmentActionSchema,
  bookingSchema,
  contactFormSchema,
  labRequestSchema,
  labVerifySchema,
  otpRequestSchema,
  otpVerifySchema,
  staffAccountSchema,
} from "@/lib/validation";
import { doctorIdOf, getDb, getSessionUserId, hasRole, saveDb, uuid } from "./store";
import { availableSlotEnd } from "./slots";
import { issueToken, reportUrl } from "./client";

const TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;
const codes = new Map();

const fail = (code, status = 400) => {
  throw { code, status };
};
const parse = (schema, body) => {
  const r = schema.safeParse(body);
  if (!r.success) fail("invalid_input");
  return r.data;
};

function issueCode(key) {
  const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  codes.set(key, { code, expires: Date.now() + TTL_MS, attempts: 0 });
  return code;
}

function checkCode(key, code) {
  const row = codes.get(key);
  if (!row) fail("invalid_code");
  if (row.attempts >= MAX_ATTEMPTS) fail("too_many_attempts");
  if (row.expires < Date.now()) fail("expired");
  if (row.code !== code) {
    row.attempts += 1;
    fail(row.attempts >= MAX_ATTEMPTS ? "too_many_attempts" : "invalid_code");
  }
  codes.delete(key);
}

const contactMatches = (row, contact, phoneKey, emailKey) =>
  contact.type === "phone" ? row[phoneKey] === contact.value : !!row[emailKey] && row[emailKey].toLowerCase() === contact.value;

/** Find the account for a verified phone/email, creating a patient account if none exists. */
function userForContact(contact, language) {
  const db = getDb();
  const cred = contact.type === "email" ? db.credentials.find((c) => c.email === contact.value) : null;
  const existing = cred ? db.profiles.find((p) => p.id === cred.user_id) : db.profiles.find((p) => contactMatches(p, contact, "phone", "email"));
  if (existing) return existing.id;
  const id = uuid();
  db.profiles.push({
    id,
    full_name: null,
    phone: contact.type === "phone" ? contact.value : null,
    email: contact.type === "email" ? contact.value : null,
    language: ["en", "si", "ta"].includes(language) ? language : "en",
    created_at: new Date().toISOString(),
  });
  db.user_roles.push({ id: uuid(), user_id: id, role: "patient" });
  db.lab_reports.forEach((r) => {
    if (!r.patient_id && contactMatches(r, contact, "patient_phone", "patient_email")) r.patient_id = id;
  });
  saveDb();
  return id;
}

function requireUser() {
  const uid = getSessionUserId();
  if (!uid || !getDb().profiles.some((p) => p.id === uid)) fail("not_authenticated", 401);
  return uid;
}

function book(body) {
  const v = parse(bookingSchema, body);
  const uid = requireUser();
  const db = getDb();
  const end = availableSlotEnd(v.doctorId, v.slotStart);
  if (!end) fail("slot_unavailable", 409);
  const upcoming = db.appointments.filter((a) => a.patient_id === uid && a.status === "booked" && new Date(a.slot_start) > new Date()).length;
  if (upcoming >= 10) fail("too_many_bookings", 409);
  const row = {
    id: uuid(),
    reference: `MF-${uuid().replace(/-/g, "").slice(0, 8).toUpperCase()}`,
    doctor_id: v.doctorId,
    patient_id: uid,
    patient_name: v.fullName,
    patient_phone: v.phone,
    patient_email: v.email,
    slot_start: v.slotStart,
    slot_end: end,
    status: "booked",
    notes: v.notes,
    created_at: new Date().toISOString(),
  };
  db.appointments.push(row);
  saveDb();
  return { ok: true, id: row.id, reference: row.reference };
}

function changeAppointment(id, body) {
  if (!z.string().uuid().safeParse(id).success) fail("invalid_input");
  const action = parse(appointmentActionSchema, body);
  const uid = requireUser();
  const db = getDb();
  const a = db.appointments.find((x) => x.id === id);
  if (!a) fail("not_found", 409);
  const admin = hasRole(uid, "admin");
  const ownDoctor = a.doctor_id === doctorIdOf(uid);
  const future = new Date(a.slot_start) > new Date();
  if (a.status !== "booked") fail("not_allowed", 409);

  if (action.action === "cancel") {
    if (!admin && !ownDoctor) {
      if (a.patient_id !== uid) fail("forbidden", 403);
      if (!future) fail("not_allowed", 409);
    }
    a.status = "cancelled";
  } else if (action.action === "complete") {
    if (!admin && !ownDoctor) fail("forbidden", 403);
    a.status = "completed";
  } else {
    if (!admin && a.patient_id !== uid) fail("forbidden", 403);
    if (!future) fail("not_allowed", 409);
    const end = availableSlotEnd(a.doctor_id, action.slotStart);
    if (!end) fail("slot_unavailable", 409);
    a.slot_start = action.slotStart;
    a.slot_end = end;
  }
  a.updated_at = new Date().toISOString();
  saveDb();
  return { ok: true };
}

function createStaff(body) {
  const uid = requireUser();
  if (!hasRole(uid, "admin")) fail("forbidden", 403);
  const v = parse(staffAccountSchema, body);
  const db = getDb();
  if (db.credentials.some((c) => c.email === v.email) || db.profiles.some((p) => p.email === v.email)) fail("email_exists", 409);
  const id = uuid();
  db.profiles.push({ id, full_name: v.fullName, phone: null, email: v.email, language: "en", created_at: new Date().toISOString() });
  db.user_roles.push({ id: uuid(), user_id: id, role: v.role });
  db.credentials.push({ email: v.email, password: v.password, user_id: id });
  saveDb();
  return { ok: true, id };
}

/** Dispatch a demo API call. Throws { code, status } like the server's { error } responses. */
export async function demoApi(path, method, body) {
  await new Promise((r) => setTimeout(r, 350));
  const apptMatch = path.match(/^\/api\/appointments\/([^/]+)$/);
  if (apptMatch && method === "PATCH") return changeAppointment(apptMatch[1], body);

  switch (path) {
    case "/api/auth/otp/request": {
      const { contact } = parse(otpRequestSchema, body);
      return { ok: true, devCode: issueCode(`login:${contact.type}:${contact.value}`) };
    }
    case "/api/auth/otp/verify": {
      const { contact, code } = parse(otpVerifySchema, body);
      checkCode(`login:${contact.type}:${contact.value}`, code);
      return { ok: true, tokenHash: issueToken(userForContact(contact, body?.language)) };
    }
    case "/api/lab/request": {
      const { invoice, contact } = parse(labRequestSchema, body);
      return { ok: true, devCode: issueCode(`lab:${invoice}:${contact.type}:${contact.value}`) };
    }
    case "/api/lab/verify": {
      const { invoice, contact, code } = parse(labVerifySchema, body);
      checkCode(`lab:${invoice}:${contact.type}:${contact.value}`, code);
      const report = getDb().lab_reports.find((r) => r.invoice_number === invoice);
      if (!report || !contactMatches(report, contact, "patient_phone", "patient_email")) fail("invalid_code");
      return {
        ok: true,
        expiresIn: 300,
        reports: [{ id: report.id, invoice: report.invoice_number, testName: report.test_name, createdAt: report.created_at, url: reportUrl(report) }],
      };
    }
    case "/api/appointments":
      return book(body);
    case "/api/contact": {
      const { website, ...msg } = parse(contactFormSchema, body);
      if (!website) {
        getDb().contact_messages.push({ id: uuid(), ...msg, created_at: new Date().toISOString() });
        saveDb();
      }
      return { ok: true };
    }
    case "/api/admin/staff":
      return createStaff(body);
    default:
      fail("not_found", 404);
  }
}
