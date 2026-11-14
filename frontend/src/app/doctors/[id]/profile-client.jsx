"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Briefcase, Building2, CalendarCheck, CalendarDays, CheckCircle2, ChevronRight, LogIn, MapPin, Navigation, Printer, UserX } from "lucide-react";
import { SiteLayout } from "@/components/layout";
import { Alert, Badge, Button, Card, EmptyState, ErrorState, Field, Input, Skeleton, Textarea, btnClass } from "@/components/kit";
import { DateStrip, SlotGrid, doctorPhoto } from "@/components/doctor-bits";
import { useBookableDates, useDoctor, useSlots, keys } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { api, errorText } from "@/lib/api";
import { bookingFormSchema } from "@/lib/validation";
import { useT } from "@/i18n";
import { dateLK, fmtDate, fmtDateTime, fmtTime, lkr, specName } from "@/lib/utils";

export default function ProfileClient({ id }) {
  const { t, lang } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const doctor = useDoctor(id);
  const [confirmed, setConfirmed] = useState(null);
  const weekdays = useBookableDates(id);
  const dates = weekdays.dates;

  const date = params.get("date") && dates.includes(params.get("date")) ? params.get("date") : dates[0];
  const slot = params.get("slot") && date && dateLK(params.get("slot")) === date ? params.get("slot") : null;
  const slots = useSlots(id, date);
  const slotOk = slot && slots.data?.some((s) => s.slot_start === slot && s.status === "available");

  const setParams = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  if (doctor.isLoading)
    return (
      <SiteLayout>
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
          <Skeleton className="h-40" />
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
        </div>
      </SiteLayout>
    );
  if (doctor.isError)
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl px-4 py-12"><ErrorState message={t("common.errorGeneric")} onRetry={() => doctor.refetch()} retryLabel={t("common.tryAgain")} /></div>
      </SiteLayout>
    );
  const d = doctor.data;
  if (!d)
    return (
      <SiteLayout>
        <div className="mx-auto max-w-xl px-4 py-16">
          <EmptyState icon={<UserX className="size-10" />} title={t("profile.notFound")}>
            <p className="text-muted-foreground">{t("profile.notFoundText")}</p>
            <Link href="/doctors" className={btnClass("primary")}>{t("profile.backToSearch")}</Link>
          </EmptyState>
        </div>
      </SiteLayout>
    );

  if (confirmed) return <Confirmation d={d} booking={confirmed} />;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm">
          <ol className="flex flex-wrap items-center gap-1 text-muted-foreground">
            <li><Link href="/" className="hover:text-primary">{t("common.home")}</Link></li>
            <li aria-hidden><ChevronRight className="size-4" /></li>
            <li><Link href="/doctors" className="hover:text-primary">{t("nav.findDoctors")}</Link></li>
            <li aria-hidden><ChevronRight className="size-4" /></li>
            <li aria-current="page" className="font-medium text-foreground">{d.name}</li>
          </ol>
        </nav>

        <Card className="flex flex-col gap-5 p-6 sm:flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={doctorPhoto(d)} alt={t("doctors.photoOf", { name: d.name })} width={128} height={128} className="size-32 rounded-2xl bg-accent object-cover" />
          <div className="flex-1 space-y-2">
            <h1 className="text-3xl font-bold">{d.name}</h1>
            <Badge tone="teal">{specName(d.specialty, lang)}</Badge>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 pt-1 text-sm">
              <li className="flex items-center gap-1.5"><Briefcase className="size-4 text-muted-foreground" aria-hidden />{t("doctors.experience", { count: d.experience_years })}</li>
              <li className="flex items-center gap-1.5"><Building2 className="size-4 text-muted-foreground" aria-hidden />{d.hospital?.name}</li>
              <li className="flex items-center gap-1.5"><MapPin className="size-4 text-muted-foreground" aria-hidden />{d.hospital?.district}</li>
            </ul>
          </div>
          <p className="text-sm text-muted-foreground sm:text-right">
            {t("doctors.fee")}
            <span className="block text-2xl font-bold text-foreground">{lkr(d.fee)}</span>
          </p>
        </Card>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-6">
            <Card as="section" aria-labelledby="pick-h" className="p-6">
              <h2 id="pick-h" className="mb-5 flex items-center gap-2 text-xl font-bold">
                <CalendarDays className="size-5 text-primary" aria-hidden />
                {t("profile.chooseDateTime")}
              </h2>
              {weekdays.isLoading ? (
                <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-28" /></div>
              ) : dates.length === 0 ? (
                <p className="rounded-lg bg-muted p-4 text-muted-foreground">{t("doctors.noSlots")}</p>
              ) : (
                <div className="space-y-6">
                  <div>
                    <StepTitle n={1}>{t("profile.pickDate")}</StepTitle>
                    <DateStrip dates={dates} value={date} onChange={(v) => setParams({ date: v, slot: null })} label={t("profile.dates")} />
                  </div>
                  <div className="border-t border-border pt-5">
                    <StepTitle n={2}>
                      {t("profile.pickTime")}
                      {date && <span className="font-normal text-muted-foreground"> · {fmtDate(date, lang)}</span>}
                    </StepTitle>
                    <SlotGrid slots={slots.data} loading={slots.isLoading} value={slot} onChange={(v) => setParams({ slot: v })} />
                  </div>
                </div>
              )}
            </Card>
            <Card as="section" className="p-6">
              <h2 className="mb-2 text-xl font-bold">{t("profile.about")}</h2>
              <p className="text-muted-foreground">{d.bio || t("profile.noBio")}</p>
            </Card>
            <Card as="section" className="p-6">
              <h2 className="mb-2 text-xl font-bold">{t("profile.hospital")}</h2>
              <p className="font-semibold">{d.hospital?.name}</p>
              <p className="mb-3 text-muted-foreground">{[d.hospital?.address, d.hospital?.district].filter(Boolean).join(", ")}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${d.hospital?.name} ${d.hospital?.district} Sri Lanka`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 font-semibold text-primary underline"
              >
                <Navigation className="size-4" aria-hidden />
                {t("profile.directions")}
              </a>
            </Card>
          </div>

          <aside aria-label={t("profile.summary")} className="lg:sticky lg:top-20 lg:self-start">
            <Card className="space-y-4 p-6">
              <h2 className="text-lg font-bold">{t("profile.summary")}</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("common.date")}</dt><dd className="font-semibold">{date ? fmtDate(date, lang) : "—"}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("common.time")}</dt><dd className="font-semibold">{slotOk ? fmtTime(slot, lang) : t("profile.selectSlot")}</dd></div>
                <div className="flex justify-between gap-2 border-t border-border pt-2 text-base font-bold"><dt>{t("doctors.fee")}</dt><dd>{lkr(d.fee)}</dd></div>
              </dl>
              {slotOk ? (
                <BookingPanel
                  doctor={d}
                  slot={slot}
                  onBooked={setConfirmed}
                  onSlotLost={() => {
                    setParams({ slot: null });
                    slots.refetch();
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{t("profile.recheck")}</p>
              )}
            </Card>
          </aside>
        </div>
      </div>
    </SiteLayout>
  );
}

function StepTitle({ n, children }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 font-semibold">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground" aria-hidden>{n}</span>
      <span>{children}</span>
    </h3>
  );
}

function BookingPanel({ doctor, slot, onBooked, onSlotLost }) {
  const { t } = useT();
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();
  const params = useSearchParams();
  if (loading) return <Skeleton className="h-40" />;
  if (!user) {
    const next = `${pathname}?${params}`;
    return (
      <div className="space-y-3 rounded-lg bg-accent p-4">
        <p className="font-semibold text-accent-foreground">{t("booking.signInTitle")}</p>
        <p className="text-sm text-foreground/80">{t("booking.signInText")}</p>
        <Link href={`/login?next=${encodeURIComponent(next)}`} className={btnClass("primary", "w-full")}>
          <LogIn className="size-4" aria-hidden />
          {t("booking.signInBtn")}
        </Link>
        <Link href={`/register?next=${encodeURIComponent(next)}`} className={btnClass("outline", "w-full")}>
          {t("login.createAccount")}
        </Link>
      </div>
    );
  }
  return <BookingForm doctor={doctor} slot={slot} profile={profile} onBooked={onBooked} onSlotLost={onSlotLost} />;
}

function BookingForm({ doctor, slot, profile, onBooked, onSlotLost }) {
  const { t } = useT();
  const qc = useQueryClient();
  const [formErr, setFormErr] = useState();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      fullName: profile?.full_name ?? "",
      phone: profile?.phone ? profile.phone.replace(/^\+94/, "0") : "",
      email: profile?.email ?? "",
      notes: "",
    },
  });
  const notesLen = watch("notes")?.length ?? 0;
  const e = (k) => errors[k] && t(errors[k].message);

  const onSubmit = async (v) => {
    setFormErr(undefined);
    try {
      const res = await api("/api/appointments", { body: { doctorId: doctor.id, slotStart: slot, ...v } });
      qc.invalidateQueries({ queryKey: keys.myAppointments });
      qc.invalidateQueries({ queryKey: ["next-slots"] });
      qc.invalidateQueries({ queryKey: ["slots", doctor.id] });
      toast.success(t("booking.successTitle"));
      onBooked({ reference: res.reference, slotStart: slot, name: v.fullName });
      window.scrollTo({ top: 0 });
    } catch (err) {
      if (err.code === "slot_unavailable") {
        toast.error(t("booking.slotTaken"));
        onSlotLost();
      } else setFormErr(errorText(t, err));
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4 border-t border-border pt-4">
      <h3 className="font-bold">{t("booking.title")}</h3>
      <Field id="b-name" label={t("booking.fullName")} error={e("fullName")}>
        <Input id="b-name" autoComplete="name" invalid={!!errors.fullName} {...register("fullName")} />
      </Field>
      <Field id="b-phone" label={t("booking.phone")} hint={t("booking.phoneHint")} error={e("phone")}>
        <Input id="b-phone" type="tel" autoComplete="tel" inputMode="tel" invalid={!!errors.phone} aria-describedby={errors.phone ? "b-phone-err" : "b-phone-hint"} {...register("phone")} />
      </Field>
      <Field id="b-email" label={t("booking.email")} optionalLabel={t("common.optional")} error={e("email")}>
        <Input id="b-email" type="email" autoComplete="email" invalid={!!errors.email} {...register("email")} />
      </Field>
      <Field id="b-notes" label={t("booking.notes")} optionalLabel={t("common.optional")} hint={t("booking.notesHint", { count: notesLen })} error={e("notes")}>
        <Textarea id="b-notes" rows={3} maxLength={500} invalid={!!errors.notes} {...register("notes")} />
      </Field>
      {formErr && <Alert tone="error">{formErr}</Alert>}
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        {isSubmitting ? t("booking.confirming") : t("booking.confirm")}
      </Button>
    </form>
  );
}

function Confirmation({ d, booking }) {
  const { t, lang } = useT();
  return (
    <SiteLayout>
      <div className="mx-auto max-w-xl px-4 py-10">
        <Card className="space-y-5 p-8 text-center">
          <CheckCircle2 className="mx-auto size-16 text-success" aria-hidden />
          <h1 className="text-2xl font-bold" role="status">{t("booking.successTitle")}</h1>
          <p className="text-muted-foreground">{t("booking.successText")}</p>
          <div className="rounded-xl border-2 border-dashed border-primary/40 bg-accent p-4">
            <p className="text-sm text-muted-foreground">{t("booking.reference")}</p>
            <p className="font-display text-3xl font-extrabold tracking-wider text-primary">{booking.reference}</p>
          </div>
          <dl className="grid gap-3 text-left text-sm sm:grid-cols-2">
            {[
              [t("booking.doctor"), d.name],
              [t("booking.when"), fmtDateTime(booking.slotStart, lang)],
              [t("booking.where"), `${d.hospital?.name}, ${d.hospital?.district}`],
              [t("booking.fee"), lkr(d.fee)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-muted p-3">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="no-print flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden />
              {t("booking.print")}
            </Button>
            <Link href="/dashboard" className={btnClass("primary")}>
              <CalendarCheck className="size-4" aria-hidden />
              {t("booking.myAppointments")}
            </Link>
          </div>
        </Card>
      </div>
    </SiteLayout>
  );
}
