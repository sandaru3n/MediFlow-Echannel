"use client";

import { buildSeed } from "./seed";

const DB_KEY = "mediflow.demo.db.v3";
const SESSION_KEY = "mediflow.demo.session";

let db = null;

export function getDb() {
  if (db) return db;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) db = JSON.parse(raw);
    } catch {}
  }
  if (!db) {
    db = buildSeed();
    saveDb();
  }
  return db;
}

export function saveDb() {
  if (typeof window === "undefined" || !db) return;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {}
}

export function resetDemo() {
  try {
    localStorage.removeItem(DB_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch {}
  db = null;
}

export function getSessionUserId() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setSessionUserId(id) {
  try {
    if (id) localStorage.setItem(SESSION_KEY, id);
    else localStorage.removeItem(SESSION_KEY);
  } catch {}
}

export const uuid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (Math.random() * 16) >> (c / 4)).toString(16));

export const hasRole = (userId, role) => getDb().user_roles.some((r) => r.user_id === userId && r.role === role);
export const doctorIdOf = (userId) => getDb().doctors.find((d) => d.user_id === userId)?.id ?? null;
