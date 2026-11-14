"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarOff, Clock, Plus, Trash2 } from "lucide-react";
import { Button, Card, EmptyState, ErrorState, Field, Input, Select, Skeleton } from "./kit";
import { useT } from "@/i18n";
import { availabilitySchema, blockDateSchema } from "@/lib/validation";
import { getSupabase } from "@/integrations/supabase/client";
import { fmtDate, todayLK } from "@/lib/utils";

const hhmm = (t) => String(t).slice(0, 5);

function useScheduleData(doctorId) {
  const hours = useQuery({
    queryKey: ["availability", doctorId],
    enabled: !!doctorId,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("availability")
        .select("id, weekday, start_time, end_time, slot_minutes")
        .eq("doctor_id", doctorId)
        .order("weekday")
        .order("start_time");
      if (error) throw error;
      return data;
    },
  });
  const blocked = useQuery({
    queryKey: ["blocked-dates", doctorId],
    enabled: !!doctorId,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("blocked_dates")
        .select("id, blocked_on, reason")
        .eq("doctor_id", doctorId)
        .gte("blocked_on", todayLK())
        .order("blocked_on");
      if (error) throw error;
      return data;
    },
  });
  return { hours, blocked };
}

/** Weekly hours + blocked dates for one doctor. RLS allows the doctor themself or an admin. */
export function ScheduleManager({ doctorId }) {
  const { hours, blocked } = useScheduleData(doctorId);
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <WeeklyHours doctorId={doctorId} q={hours} />
      <BlockedDates doctorId={doctorId} q={blocked} />
    </div>
  );
}

function useInvalidateSlots() {
  const qc = useQueryClient();
  return (doctorId) => {
    qc.invalidateQueries({ queryKey: ["availability", doctorId] });
    qc.invalidateQueries({ queryKey: ["blocked-dates", doctorId] });
    qc.invalidateQueries({ queryKey: ["availability-days", doctorId] });
    qc.invalidateQueries({ queryKey: ["slots", doctorId] });
    qc.invalidateQueries({ queryKey: ["next-slots"] });
  };
}

function WeeklyHours({ doctorId, q }) {
  const { t } = useT();
  const invalidate = useInvalidateSlots();
  const days = t("doctorDash.days", { returnObjects: true });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(availabilitySchema), defaultValues: { weekday: 1, start_time: "16:00", end_time: "19:00", slot_minutes: 15 } });
  const e = (k) => errors[k] && t(errors[k].message);

  const add = async (v) => {
    const { error } = await getSupabase().from("availability").insert({ ...v, doctor_id: doctorId });
    if (error) return toast.error(t("common.errorGeneric"));
    toast.success(t("doctorDash.hoursSaved"));
    reset(v);
    invalidate(doctorId);
  };
  const remove = async (id) => {
    const { error } = await getSupabase().from("availability").delete().eq("id", id);
    if (error) return toast.error(t("common.errorGeneric"));
    toast.success(t("doctorDash.hoursSaved"));
    invalidate(doctorId);
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold">{t("doctorDash.weekly")}</h2>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("doctorDash.weeklyHint")}</p>
      {q.isLoading ? (
        <Skeleton className="h-32" />
      ) : q.isError ? (
        <ErrorState message={t("common.errorGeneric")} onRetry={q.refetch} retryLabel={t("common.tryAgain")} />
      ) : !q.data.length ? (
        <EmptyState icon={<Clock className="size-10" />} title={t("doctorDash.noHours")} />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {q.data.map((r) => (
            <li key={r.id} className="flex items-center gap-3 p-3">
              <span className="w-28 font-semibold">{days[r.weekday]}</span>
              <span className="flex-1 text-sm">
                {hhmm(r.start_time)} – {hhmm(r.end_time)} · {r.slot_minutes} min
              </span>
              <Button size="sm" variant="ghost" onClick={() => remove(r.id)} aria-label={`${t("common.delete")} ${days[r.weekday]} ${hhmm(r.start_time)}`}>
                <Trash2 className="size-4 text-destructive" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form noValidate onSubmit={handleSubmit(add)} className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field id={`av-day-${doctorId}`} label={t("doctorDash.weekday")}>
          <Select id={`av-day-${doctorId}`} {...register("weekday")}>
            {days.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </Select>
        </Field>
        <Field id={`av-slot-${doctorId}`} label={t("doctorDash.slotMinutes")} error={e("slot_minutes")}>
          <Input id={`av-slot-${doctorId}`} type="number" min={5} max={120} step={5} invalid={!!errors.slot_minutes} {...register("slot_minutes")} />
        </Field>
        <Field id={`av-start-${doctorId}`} label={t("doctorDash.start")} error={e("start_time")}>
          <Input id={`av-start-${doctorId}`} type="time" invalid={!!errors.start_time} {...register("start_time")} />
        </Field>
        <Field id={`av-end-${doctorId}`} label={t("doctorDash.end")} error={e("end_time")}>
          <Input id={`av-end-${doctorId}`} type="time" invalid={!!errors.end_time} {...register("end_time")} />
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" loading={isSubmitting}>
            <Plus className="size-4" aria-hidden />
            {t("doctorDash.addHours")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function BlockedDates({ doctorId, q }) {
  const { t, lang } = useT();
  const invalidate = useInvalidateSlots();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(blockDateSchema), defaultValues: { blocked_on: "", reason: "" } });

  const add = async (v) => {
    const { error } = await getSupabase().from("blocked_dates").insert({ ...v, doctor_id: doctorId });
    // 23505: the date is already blocked, which is the outcome the user wanted.
    if (error && error.code !== "23505") return toast.error(t("common.errorGeneric"));
    toast.success(t("common.saved"));
    reset();
    invalidate(doctorId);
  };
  const remove = async (id) => {
    const { error } = await getSupabase().from("blocked_dates").delete().eq("id", id);
    if (error) return toast.error(t("common.errorGeneric"));
    invalidate(doctorId);
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold">{t("doctorDash.blockDates")}</h2>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("doctorDash.blockHint")}</p>
      {q.isLoading ? (
        <Skeleton className="h-24" />
      ) : q.isError ? (
        <ErrorState message={t("common.errorGeneric")} onRetry={q.refetch} retryLabel={t("common.tryAgain")} />
      ) : !q.data.length ? (
        <EmptyState icon={<CalendarOff className="size-10" />} title={t("doctorDash.noBlocked")} />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {q.data.map((b) => (
            <li key={b.id} className="flex items-center gap-3 p-3">
              <span className="font-semibold">{fmtDate(b.blocked_on, lang)}</span>
              <span className="flex-1 truncate text-sm text-muted-foreground">{b.reason}</span>
              <Button size="sm" variant="outline" onClick={() => remove(b.id)}>{t("doctorDash.unblock")}</Button>
            </li>
          ))}
        </ul>
      )}
      <form noValidate onSubmit={handleSubmit(add)} className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field id={`bd-date-${doctorId}`} label={t("common.date")} error={errors.blocked_on && t(errors.blocked_on.message)}>
          <Input id={`bd-date-${doctorId}`} type="date" min={todayLK()} invalid={!!errors.blocked_on} {...register("blocked_on")} />
        </Field>
        <Field id={`bd-reason-${doctorId}`} label={t("doctorDash.reason")} optionalLabel={t("common.optional")}>
          <Input id={`bd-reason-${doctorId}`} maxLength={200} {...register("reason")} />
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" variant="outline" loading={isSubmitting}>
            <CalendarOff className="size-4" aria-hidden />
            {t("doctorDash.blockDate")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
