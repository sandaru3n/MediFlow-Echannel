"use client";

import { addDays, todayLK } from "@/lib/utils";
import { getDb } from "./store";

const toMin = (t) => {
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + m;
};
const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const iso = (date, min) => `${date}T${hhmm(min)}:00+05:30`;
const weekdayOf = (date) => new Date(date + "T00:00:00Z").getUTCDay();
const same = (a, b) => new Date(a).getTime() === new Date(b).getTime();

/** Same rules as the get_doctor_slots SQL function: weekly hours minus blocked dates, booked and past slots. */
export function doctorSlots(doctorId, date) {
  const db = getDb();
  const doctor = db.doctors.find((d) => d.id === doctorId && d.active);
  const today = todayLK();
  if (!doctor || !date || date < today || date > addDays(today, 90)) return [];
  if (db.blocked_dates.some((b) => b.doctor_id === doctorId && b.blocked_on === date)) return [];
  const now = Date.now();
  const seen = new Set();
  const out = [];
  db.availability
    .filter((a) => a.doctor_id === doctorId && a.weekday === weekdayOf(date))
    .forEach((a) => {
      for (let m = toMin(a.start_time); m + a.slot_minutes <= toMin(a.end_time); m += a.slot_minutes) {
        const slot_start = iso(date, m);
        if (seen.has(slot_start)) continue;
        seen.add(slot_start);
        const status =
          new Date(slot_start).getTime() <= now
            ? "past"
            : db.appointments.some((ap) => ap.doctor_id === doctorId && ap.status === "booked" && same(ap.slot_start, slot_start))
              ? "booked"
              : "available";
        out.push({ slot_start, slot_end: iso(date, m + a.slot_minutes), status });
      }
    });
  return out.sort((x, y) => new Date(x.slot_start) - new Date(y.slot_start));
}

/** First available slot per active doctor within `days` days from `from`. */
export function nextSlots(from, days) {
  const start = from || todayLK();
  return getDb()
    .doctors.filter((d) => d.active)
    .map((d) => {
      let next = null;
      for (let i = 0; i <= days && !next; i++) {
        next = doctorSlots(d.id, addDays(start, i)).find((s) => s.status === "available")?.slot_start ?? null;
      }
      return { doctor_id: d.id, next_slot: next };
    });
}

/** The slot end if `slotStart` is currently bookable for this doctor, else null. */
export function availableSlotEnd(doctorId, slotStart) {
  const date = new Date(slotStart).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
  return doctorSlots(doctorId, date).find((s) => s.status === "available" && same(s.slot_start, slotStart))?.slot_end ?? null;
}
