"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "@/integrations/supabase/client";
import { addDays, todayLK } from "@/lib/utils";

const unwrap = ({ data, error }) => {
  if (error) throw error;
  return data;
};

/** Current time in ms, refreshed every `intervalMs` so "upcoming vs past" splits stay correct. */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export const DOCTOR_FIELDS =
  "id, name, experience_years, fee, bio, photo_url, active, user_id, specialty:specialties(id, name_en, name_si, name_ta), hospital:hospitals(id, name, district, address)";

export const keys = {
  specialties: ["specialties"],
  hospitals: ["hospitals"],
  doctors: ["doctors"],
  doctor: (id) => ["doctor", id],
  nextSlots: (date) => ["next-slots", date ?? "any"],
  slots: (id, date) => ["slots", id, date],
  myAppointments: ["my-appointments"],
  myReports: ["my-reports"],
};

export const useSpecialties = () =>
  useQuery({
    queryKey: keys.specialties,
    queryFn: async () => unwrap(await getSupabase().from("specialties").select("id, name_en, name_si, name_ta").order("name_en")),
    staleTime: 5 * 60_000,
  });

export const useHospitals = () =>
  useQuery({
    queryKey: keys.hospitals,
    queryFn: async () => unwrap(await getSupabase().from("hospitals").select("id, name, district, address").order("name")),
    staleTime: 5 * 60_000,
  });

export const useDoctors = () =>
  useQuery({
    queryKey: keys.doctors,
    queryFn: async () => unwrap(await getSupabase().from("doctors").select(DOCTOR_FIELDS).eq("active", true).order("name")),
  });

export const useDoctor = (id) =>
  useQuery({
    queryKey: keys.doctor(id),
    enabled: !!id,
    queryFn: async () => unwrap(await getSupabase().from("doctors").select(DOCTOR_FIELDS).eq("id", id).eq("active", true).maybeSingle()),
  });

/** Map doctor_id -> first available slot (ISO). With a date, only slots on that date count. */
export const useNextSlots = (date) =>
  useQuery({
    queryKey: keys.nextSlots(date),
    queryFn: async () => {
      const rows = unwrap(await getSupabase().rpc("doctor_next_slots", { p_from: date || null, p_days: date ? 0 : 30 }));
      return Object.fromEntries(rows.map((r) => [r.doctor_id, r.next_slot]));
    },
  });

/** Upcoming dates (max 14 within 30 days) on which the doctor has weekly hours. */
export function useBookableDates(doctorId) {
  const q = useQuery({
    queryKey: ["availability-days", doctorId],
    enabled: !!doctorId,
    queryFn: async () => {
      const { data, error } = await getSupabase().from("availability").select("weekday").eq("doctor_id", doctorId);
      if (error) throw error;
      return [...new Set(data.map((r) => r.weekday))];
    },
  });
  const dates = useMemo(() => {
    if (!q.data) return [];
    const today = todayLK();
    const out = [];
    for (let i = 0; i <= 30 && out.length < 14; i++) {
      const d = addDays(today, i);
      if (q.data.includes(new Date(d + "T00:00:00Z").getUTCDay())) out.push(d);
    }
    return out;
  }, [q.data]);
  return { ...q, dates };
}

export const useSlots = (doctorId, date) =>
  useQuery({
    queryKey: keys.slots(doctorId, date),
    enabled: !!doctorId && !!date,
    queryFn: async () => unwrap(await getSupabase().rpc("get_doctor_slots", { p_doctor: doctorId, p_date: date })),
    refetchInterval: 60_000,
  });

export const APPOINTMENT_FIELDS =
  "id, reference, slot_start, slot_end, status, notes, patient_name, patient_phone, doctor:doctors(id, name, photo_url, specialty:specialties(name_en, name_si, name_ta), hospital:hospitals(name, district))";

export const useMyAppointments = (userId) =>
  useQuery({
    queryKey: [...keys.myAppointments, userId],
    enabled: !!userId,
    queryFn: async () =>
      unwrap(await getSupabase().from("appointments").select(APPOINTMENT_FIELDS).eq("patient_id", userId).order("slot_start", { ascending: true })),
  });

export const useMyReports = (userId) =>
  useQuery({
    queryKey: [...keys.myReports, userId],
    enabled: !!userId,
    queryFn: async () =>
      unwrap(
        await getSupabase()
          .from("lab_reports")
          .select("id, invoice_number, test_name, file_path, created_at")
          .eq("patient_id", userId)
          .order("created_at", { ascending: false }),
      ),
  });

/** Short-lived signed URL for a private lab report (storage RLS decides who may sign). */
export async function openReport(filePath, invoice) {
  const { data, error } = await getSupabase()
    .storage.from("lab-reports")
    .createSignedUrl(filePath, 60, { download: `${invoice}.pdf` });
  if (error) throw error;
  window.location.assign(data.signedUrl);
}
