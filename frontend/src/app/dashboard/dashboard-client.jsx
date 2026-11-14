"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarCheck, CalendarX, FlaskConical, LayoutDashboard, Search, UserRound } from "lucide-react";
import { DashboardShell } from "@/components/layout";
import { RequireRole } from "@/components/guard";
import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Select, Skeleton, btnClass } from "@/components/kit";
import { AppointmentCard, CancelDialog, ReportsTable, RescheduleDialog } from "@/components/appointments";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { useMyAppointments, useMyReports, useNow } from "@/lib/data";
import { profileSchema } from "@/lib/validation";
import { getSupabase } from "@/integrations/supabase/client";
import { useT, LANGS } from "@/i18n";
import { fmtDateTime, specName } from "@/lib/utils";

export default function DashboardClient() {
  return (
    <RequireRole>
      <PatientDash />
    </RequireRole>
  );
}

function PatientDash() {
  const { t } = useT();
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const appts = useMyAppointments(user?.id);
  const reports = useMyReports(user?.id);
  const items = [
    { key: "overview", label: t("dash.overview"), icon: LayoutDashboard },
    { key: "appts", label: t("dash.appointments"), icon: CalendarCheck },
    { key: "reports", label: t("dash.reports"), icon: FlaskConical },
    { key: "profile", label: t("dash.profile"), icon: UserRound },
  ];
  const now = useNow();
  const upcoming = (appts.data ?? []).filter((a) => a.status === "booked" && new Date(a.slot_start).getTime() > now);
  const past = (appts.data ?? []).filter((a) => !upcoming.includes(a)).reverse();

  return (
    <DashboardShell title={t("dash.patientTitle")} role={t("dash.patientRole")} items={items} active={tab} onSelect={setTab}>
      <div className="mx-auto max-w-5xl space-y-4">
        {tab === "overview" && <Overview upcoming={upcoming} appts={appts} reports={reports} go={setTab} />}
        {tab === "appts" && <Appointments upcoming={upcoming} past={past} appts={appts} />}
        {tab === "reports" && (
          <>
            <PageHeader title={t("dash.reports")} sub={t("dash.secureLinks")} />
            {reports.isError ? <ErrorState message={t("common.errorGeneric")} onRetry={reports.refetch} retryLabel={t("common.tryAgain")} /> : <ReportsTable reports={reports.data} loading={reports.isLoading} />}
          </>
        )}
        {tab === "profile" && <Profile />}
      </div>
    </DashboardShell>
  );
}

function Overview({ upcoming, appts, reports, go }) {
  const { t, lang } = useT();
  const { profile } = useAuth();
  const next = upcoming[0];
  return (
    <>
      <PageHeader title={profile?.full_name ? t("dash.welcome", { name: profile.full_name }) : t("login.welcome")} sub={t("dash.welcomeSub")} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <p className="text-sm font-semibold text-secondary">{t("dash.nextAppt")}</p>
          {appts.isLoading ? (
            <Skeleton className="mt-3 h-20" />
          ) : next ? (
            <>
              <h2 className="mt-1 text-2xl font-bold">{next.doctor?.name}</h2>
              <p className="mt-1 text-muted-foreground">
                {fmtDateTime(next.slot_start, lang)} · {next.doctor?.hospital?.name}
              </p>
              <p className="text-sm text-muted-foreground">{specName(next.doctor?.specialty, lang)} · {t("dash.ref")} <strong className="font-mono text-foreground">{next.reference}</strong></p>
            </>
          ) : (
            <p className="mt-2 text-muted-foreground">{t("dash.noUpcoming")}</p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/doctors" className={btnClass("primary")}><Search className="size-4" aria-hidden />{t("dash.findDoctor")}</Link>
            {next && <Button variant="outline" onClick={() => go("appts")}>{t("dash.appointments")}</Button>}
          </div>
        </Card>
        <div className="grid gap-4">
          <Card className="p-5"><p className="text-sm text-muted-foreground">{t("dash.upcoming")}</p><p className="text-3xl font-bold">{appts.isLoading ? "—" : upcoming.length}</p></Card>
          <Card className="p-5"><p className="text-sm text-muted-foreground">{t("dash.reports")}</p><p className="text-3xl font-bold">{reports.isLoading ? "—" : (reports.data?.length ?? 0)}</p></Card>
        </div>
      </div>
    </>
  );
}

function Appointments({ upcoming, past, appts }) {
  const { t } = useT();
  const [cancel, setCancel] = useState(null);
  const [resched, setResched] = useState(null);
  if (appts.isError) return <ErrorState message={t("common.errorGeneric")} onRetry={appts.refetch} retryLabel={t("common.tryAgain")} />;
  const list = (rows, empty, withActions) =>
    appts.isLoading ? (
      <div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
    ) : rows.length === 0 ? (
      <EmptyState icon={<CalendarX className="size-10" />} title={empty}>
        <Link href="/doctors" className={btnClass("primary")}>{t("dash.findDoctor")}</Link>
      </EmptyState>
    ) : (
      <div className="space-y-3">
        {rows.map((a) => (
          <AppointmentCard
            key={a.id}
            a={a}
            actions={
              withActions && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setResched(a)}>{t("dash.reschedule")}</Button>
                  <Button variant="danger" size="sm" onClick={() => setCancel(a)}>{t("dash.cancel")}</Button>
                </>
              )
            }
          />
        ))}
      </div>
    );
  return (
    <>
      <PageHeader title={t("dash.appointments")} />
      <Tabs defaultValue="upcoming">
        <TabsList className="grid-cols-2 sm:inline-grid sm:w-auto">
          <TabsTrigger value="upcoming">{t("dash.upcoming")} ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">{t("dash.past")} ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">{list(upcoming, t("dash.noUpcoming"), true)}</TabsContent>
        <TabsContent value="past">{list(past, t("dash.noPast"), false)}</TabsContent>
      </Tabs>
      <CancelDialog appt={cancel} open={!!cancel} onOpenChange={(o) => !o && setCancel(null)} />
      <RescheduleDialog appt={resched} open={!!resched} onOpenChange={(o) => !o && setResched(null)} />
    </>
  );
}

function Profile() {
  const { t, setLang } = useT();
  const { user, profile, refresh } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: profile?.full_name ?? "", language: profile?.language ?? "en" },
  });
  const onSubmit = async (v) => {
    const { error } = await getSupabase().from("profiles").update(v).eq("id", user.id);
    if (error) return toast.error(t("common.errorGeneric"));
    setLang(v.language);
    await refresh();
    toast.success(t("dash.profileSaved"));
  };
  return (
    <>
      <PageHeader title={t("dash.profile")} />
      <Card className="max-w-xl p-6">
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field id="p-name" label={t("dash.fullName")} error={errors.full_name && t(errors.full_name.message)}>
            <Input id="p-name" autoComplete="name" invalid={!!errors.full_name} {...register("full_name")} />
          </Field>
          <Field id="p-contact" label={profile?.phone ? t("dash.phone") : t("common.email")}>
            <Input id="p-contact" value={profile?.phone ?? profile?.email ?? ""} readOnly disabled />
          </Field>
          <Field id="p-lang" label={t("dash.language")}>
            <Select id="p-lang" {...register("language")}>
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </Select>
          </Field>
          <Button type="submit" loading={isSubmitting}>{t("dash.saveProfile")}</Button>
        </form>
      </Card>
    </>
  );
}
