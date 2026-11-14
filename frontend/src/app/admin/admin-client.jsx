"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Building2, CalendarDays, CalendarX, FlaskConical, Stethoscope, Tags, Users } from "lucide-react";
import { DashboardShell } from "@/components/layout";
import { RequireRole } from "@/components/guard";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Select, Skeleton, statusTone } from "@/components/kit";
import { CancelDialog } from "@/components/appointments";
import { LabUploadForm, StaffReports } from "@/components/lab-upload";
import { getSupabase } from "@/integrations/supabase/client";
import { useNow } from "@/lib/data";
import { useT } from "@/i18n";
import { fmtDateTime } from "@/lib/utils";
import { DoctorsAdmin, HospitalsAdmin, SearchBox, SpecialtiesAdmin } from "./directory";
import { UsersAdmin } from "./users";

export default function AdminClient() {
  return (
    <RequireRole role="admin">
      <AdminDash />
    </RequireRole>
  );
}

const ADMIN_APPT_FIELDS =
  "id, reference, slot_start, slot_end, status, notes, patient_name, patient_phone, patient_email, created_at, doctor:doctors(id, name, hospital:hospitals(name))";

function useAllAppointments() {
  return useQuery({
    queryKey: ["admin-appointments"],
    queryFn: async () => {
      const { data, error } = await getSupabase().from("appointments").select(ADMIN_APPT_FIELDS).order("slot_start", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });
}

function AdminDash() {
  const { t } = useT();
  const [tab, setTab] = useState("overview");
  const items = [
    { key: "overview", label: t("admin.overview"), icon: BarChart3 },
    { key: "doctors", label: t("admin.doctors"), icon: Stethoscope },
    { key: "hospitals", label: t("admin.hospitals"), icon: Building2 },
    { key: "specialties", label: t("admin.specialties"), icon: Tags },
    { key: "users", label: t("admin.users"), icon: Users },
    { key: "appts", label: t("admin.appointments"), icon: CalendarDays },
    { key: "reports", label: t("admin.reports"), icon: FlaskConical },
  ];
  return (
    <DashboardShell title={t("admin.title")} role={t("admin.role_admin")} items={items} active={tab} onSelect={setTab}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        {tab === "overview" && <Overview go={setTab} />}
        {tab === "doctors" && <DoctorsAdmin />}
        {tab === "hospitals" && <HospitalsAdmin />}
        {tab === "specialties" && <SpecialtiesAdmin />}
        {tab === "users" && <UsersAdmin />}
        {tab === "appts" && <AppointmentsAdmin />}
        {tab === "reports" && (
          <>
            <PageHeader title={t("admin.reports")} />
            <LabUploadForm />
            <StaffReports canDelete />
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function Overview({ go }) {
  const { t, lang } = useT();
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc("admin_stats");
      if (error) throw error;
      return data?.[0] ?? { bookings: 0, doctors: 0, patients: 0, reports: 0 };
    },
  });
  const recent = useQuery({
    queryKey: ["admin-recent"],
    queryFn: async () => {
      const { data, error } = await getSupabase().from("appointments").select(ADMIN_APPT_FIELDS).order("created_at", { ascending: false }).limit(8);
      if (error) throw error;
      return data;
    },
  });
  const cards = [
    ["bookings", t("admin.statBookings"), CalendarDays, "appts"],
    ["doctors", t("admin.statDoctors"), Stethoscope, "doctors"],
    ["patients", t("admin.statPatients"), Users, "users"],
    ["reports", t("admin.statReports"), FlaskConical, "reports"],
  ];
  return (
    <>
      <PageHeader title={t("admin.overview")} />
      {stats.isError ? (
        <ErrorState message={t("common.errorGeneric")} onRetry={stats.refetch} retryLabel={t("common.tryAgain")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([k, label, I, target]) => (
            <button key={k} type="button" onClick={() => go(target)} className="rounded-xl text-left">
              <Card className="h-full p-5 transition-shadow hover:shadow-lg">
                <I className="size-6 text-primary" aria-hidden />
                <p className="mt-3 text-sm text-muted-foreground">{label}</p>
                <p className="text-3xl font-bold">{stats.isLoading ? "—" : Number(stats.data[k]).toLocaleString()}</p>
              </Card>
            </button>
          ))}
        </div>
      )}
      <Card className="p-6">
        <h2 className="mb-3 text-xl font-bold">{t("admin.recentBookings")}</h2>
        {recent.isLoading ? (
          <Skeleton className="h-32" />
        ) : recent.isError ? (
          <ErrorState message={t("common.errorGeneric")} onRetry={recent.refetch} retryLabel={t("common.tryAgain")} />
        ) : !recent.data.length ? (
          <p className="text-muted-foreground">{t("admin.empty")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.data.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
                <span className="font-mono font-semibold">{a.reference}</span>
                <span className="flex-1">{a.patient_name} → {a.doctor?.name}</span>
                <span className="text-muted-foreground">{fmtDateTime(a.slot_start, lang)}</span>
                <Badge tone={statusTone(a.status)}>{t(`dash.status_${a.status}`)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function AppointmentsAdmin() {
  const { t, lang } = useT();
  const appts = useAllAppointments();
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [cancel, setCancel] = useState(null);
  const needle = q.trim().toLowerCase();
  const rows = (appts.data ?? []).filter(
    (a) =>
      (status === "all" || a.status === status) &&
      (!needle || [a.reference, a.patient_name, a.patient_phone, a.doctor?.name].some((x) => x?.toLowerCase().includes(needle))),
  );
  const now = useNow();
  return (
    <>
      <PageHeader title={t("admin.appointments")}>
        <Select aria-label={t("admin.filterStatus")} value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 w-auto">
          <option value="all">{t("common.all")}</option>
          {["booked", "completed", "cancelled"].map((s) => <option key={s} value={s}>{t(`dash.status_${s}`)}</option>)}
        </Select>
      </PageHeader>
      <SearchBox value={q} onChange={setQ} label={t("common.search")} />
      {appts.isLoading ? (
        <Skeleton className="h-48" />
      ) : appts.isError ? (
        <ErrorState message={t("common.errorGeneric")} onRetry={appts.refetch} retryLabel={t("common.tryAgain")} />
      ) : !rows.length ? (
        <EmptyState icon={<CalendarX className="size-10" />} title={t("admin.empty")} />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted">
              <tr>
                <th scope="col" className="p-3">{t("dash.ref")}</th>
                <th scope="col" className="p-3">{t("admin.patient")}</th>
                <th scope="col" className="p-3">{t("admin.doctor")}</th>
                <th scope="col" className="p-3">{t("booking.when")}</th>
                <th scope="col" className="p-3">{t("common.status")}</th>
                <th scope="col" className="p-3"><span className="sr-only">{t("common.actions")}</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="p-3 font-mono font-semibold">{a.reference}</td>
                  <td className="p-3">{a.patient_name}<span className="block text-xs text-muted-foreground">{a.patient_phone}</span></td>
                  <td className="p-3">{a.doctor?.name}<span className="block text-xs text-muted-foreground">{a.doctor?.hospital?.name}</span></td>
                  <td className="p-3">{fmtDateTime(a.slot_start, lang)}</td>
                  <td className="p-3"><Badge tone={statusTone(a.status)}>{t(`dash.status_${a.status}`)}</Badge></td>
                  <td className="p-3 text-right">
                    {a.status === "booked" && new Date(a.slot_start).getTime() > now && (
                      <Button size="sm" variant="outline" onClick={() => setCancel(a)}>{t("admin.markCancelled")}</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <CancelDialog appt={cancel} open={!!cancel} onOpenChange={(o) => !o && setCancel(null)} />
    </>
  );
}
