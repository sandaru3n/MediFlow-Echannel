"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, CalendarX, CheckCircle2, Clock, FlaskConical, LayoutDashboard, Phone } from "lucide-react";
import { DashboardShell } from "@/components/layout";
import { RequireRole } from "@/components/guard";
import { Alert, Badge, Button, Card, EmptyState, ErrorState, PageHeader, Select, Skeleton, Spinner, statusTone } from "@/components/kit";
import { CancelDialog, useAppointmentAction } from "@/components/appointments";
import { ScheduleManager } from "@/components/schedule";
import { LabUploadForm, StaffReports } from "@/components/lab-upload";
import { useAuth } from "@/lib/auth";
import { DOCTOR_FIELDS } from "@/lib/data";
import { errorText } from "@/lib/api";
import { getSupabase } from "@/integrations/supabase/client";
import { useT } from "@/i18n";
import { addDays, dateLK, fmtDate, fmtTime, specName, todayLK } from "@/lib/utils";

export default function DoctorClient() {
  return (
    <RequireRole role="doctor">
      <DoctorDash />
    </RequireRole>
  );
}

const STAFF_APPT_FIELDS = "id, reference, slot_start, slot_end, status, notes, patient_name, patient_phone, patient_email";

function DoctorDash() {
  const { t, lang } = useT();
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");

  const me = useQuery({
    queryKey: ["my-doctor", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await getSupabase().from("doctors").select(DOCTOR_FIELDS).eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const doctorId = me.data?.id;
  const today = todayLK();
  const appts = useQuery({
    queryKey: ["doctor-appointments", doctorId],
    enabled: !!doctorId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("appointments")
        .select(STAFF_APPT_FIELDS)
        .eq("doctor_id", doctorId)
        .gte("slot_start", `${addDays(today, -30)}T00:00:00+05:30`)
        .order("slot_start");
      if (error) throw error;
      return data;
    },
  });

  const items = [
    { key: "overview", label: t("doctorDash.today"), icon: LayoutDashboard },
    { key: "appts", label: t("doctorDash.upcoming"), icon: CalendarDays },
    { key: "avail", label: t("doctorDash.availability"), icon: Clock },
    { key: "reports", label: t("doctorDash.reports"), icon: FlaskConical },
  ];

  const all = appts.data ?? [];
  const todays = all.filter((a) => dateLK(a.slot_start) === today);
  const upcoming = all.filter((a) => dateLK(a.slot_start) > today);
  const linkable = all.filter((a) => a.status !== "cancelled");

  const body = () => {
    if (me.isLoading) return <Spinner label={t("common.loading")} />;
    if (me.isError) return <ErrorState message={t("common.errorGeneric")} onRetry={me.refetch} retryLabel={t("common.tryAgain")} />;
    if (!me.data) return <Alert tone="warning">{t("doctorDash.notLinked")}</Alert>;
    if (tab === "avail")
      return (
        <>
          <PageHeader title={t("doctorDash.availability")} />
          <ScheduleManager doctorId={doctorId} />
        </>
      );
    if (tab === "reports")
      return (
        <>
          <PageHeader title={t("doctorDash.reports")} />
          <LabUploadForm appointments={linkable} />
          <StaffReports />
        </>
      );
    if (appts.isError) return <ErrorState message={t("common.errorGeneric")} onRetry={appts.refetch} retryLabel={t("common.tryAgain")} />;
    if (tab === "appts") return <UpcomingList rows={upcoming} loading={appts.isLoading} />;
    return (
      <>
        <PageHeader title={me.data.name} sub={`${specName(me.data.specialty, lang)} · ${me.data.hospital?.name} · ${fmtDate(today, lang)}`} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label={t("doctorDash.statToday")} value={todays.filter((a) => a.status !== "cancelled").length} loading={appts.isLoading} />
          <Stat label={t("doctorDash.statUpcoming")} value={upcoming.filter((a) => a.status === "booked").length} loading={appts.isLoading} />
          <Stat label={t("doctorDash.statCompleted")} value={todays.filter((a) => a.status === "completed").length} loading={appts.isLoading} />
        </div>
        <h2 className="pt-2 text-xl font-bold">{t("doctorDash.today")}</h2>
        <ApptList rows={todays} loading={appts.isLoading} empty={t("doctorDash.noToday")} timeOnly />
      </>
    );
  };

  return (
    <DashboardShell title={t("doctorDash.title")} role={t("doctorDash.role")} items={items} active={tab} onSelect={setTab}>
      <div className="mx-auto max-w-6xl space-y-4">{body()}</div>
    </DashboardShell>
  );
}

function Stat({ label, value, loading }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold">{loading ? "—" : value}</p>
    </Card>
  );
}

function UpcomingList({ rows, loading }) {
  const { t } = useT();
  const [status, setStatus] = useState("booked");
  const shown = status === "all" ? rows : rows.filter((a) => a.status === status);
  return (
    <>
      <PageHeader title={t("doctorDash.upcoming")}>
        <Select aria-label={t("admin.filterStatus")} value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 w-auto">
          <option value="all">{t("common.all")}</option>
          {["booked", "completed", "cancelled"].map((s) => <option key={s} value={s}>{t(`dash.status_${s}`)}</option>)}
        </Select>
      </PageHeader>
      <ApptList rows={shown} loading={loading} empty={t("doctorDash.noUpcoming")} />
    </>
  );
}

function ApptList({ rows, loading, empty, timeOnly }) {
  const { t, lang } = useT();
  const act = useAppointmentAction();
  const [busy, setBusy] = useState(null);
  const [cancel, setCancel] = useState(null);
  if (loading) return <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>;
  if (!rows.length) return <EmptyState icon={<CalendarX className="size-10" />} title={empty} />;

  const complete = async (a) => {
    setBusy(a.id);
    try {
      await act(a.id, { action: "complete" });
      toast.success(t("doctorDash.markedCompleted"));
    } catch (err) {
      toast.error(errorText(t, err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <ul className="space-y-3">
        {rows.map((a) => (
          <li key={a.id}>
            <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
              <div className="w-28 shrink-0">
                <p className="text-lg font-bold">{fmtTime(a.slot_start, lang)}</p>
                {!timeOnly && <p className="text-sm text-muted-foreground">{fmtDate(a.slot_start, lang)}</p>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{a.patient_name}</p>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <a href={`tel:${a.patient_phone}`} className="inline-flex items-center gap-1 hover:text-primary">
                    <Phone className="size-3.5" aria-hidden />
                    {a.patient_phone}
                  </a>
                  <span>{t("dash.ref")} <strong className="font-mono text-foreground">{a.reference}</strong></span>
                  <Badge tone={statusTone(a.status)}>{t(`dash.status_${a.status}`)}</Badge>
                </p>
                {a.notes && <p className="mt-1 text-sm"><span className="font-semibold">{t("doctorDash.notes")}:</span> {a.notes}</p>}
              </div>
              {a.status === "booked" && (
                <div className="flex gap-2">
                  <Button size="sm" variant="teal" loading={busy === a.id} onClick={() => complete(a)}>
                    <CheckCircle2 className="size-4" aria-hidden />
                    {t("doctorDash.markCompleted")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setCancel(a)}>{t("dash.cancel")}</Button>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>
      <CancelDialog appt={cancel} open={!!cancel} onOpenChange={(o) => !o && setCancel(null)} />
    </>
  );
}
