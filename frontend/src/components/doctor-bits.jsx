"use client";

import Link from "next/link";
import { Briefcase, Building2, CalendarClock, CalendarX, MapPin, Moon, Sun, Sunrise } from "lucide-react";
import { Badge, Card, Skeleton, btnClass } from "./kit";
import { useT } from "@/i18n";
import { addDays, avatarFor, cn, dateLK, dateParts, fmtDate, fmtDateTime, fmtTime, hourLK, lkr, specName, todayLK } from "@/lib/utils";

export const doctorPhoto = (d) => d.photo_url || avatarFor(d.name);

export function DoctorCard({ d, nextSlot }) {
  const { t, lang } = useT();
  return (
    <Card as="article" className="flex flex-col p-4">
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={doctorPhoto(d)} alt={t("doctors.photoOf", { name: d.name })} width={72} height={72} loading="lazy" className="size-18 shrink-0 rounded-xl bg-accent object-cover" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold">{d.name}</h3>
          <Badge tone="teal" className="mt-1">{specName(d.specialty, lang)}</Badge>
        </div>
      </div>
      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex items-center gap-2">
          <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <dt className="sr-only">{t("doctors.hospital")}</dt>
          <dd className="truncate">{d.hospital?.name}</dd>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <dt className="sr-only">{t("doctors.district")}</dt>
          <dd>{d.hospital?.district}</dd>
        </div>
        <div className="flex items-center gap-2">
          <Briefcase className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <dt className="sr-only">{t("admin.experienceYears")}</dt>
          <dd>{t("doctors.experience", { count: d.experience_years })}</dd>
        </div>
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <dt className="sr-only">{t("doctors.nextSlot")}</dt>
          <dd>
            {nextSlot === undefined ? (
              <Skeleton className="h-4 w-32" />
            ) : nextSlot ? (
              <span className="font-semibold text-success">{t("doctors.nextSlot")}: {fmtDateTime(nextSlot, lang)}</span>
            ) : (
              <span className="text-muted-foreground">{t("doctors.noSlots")}</span>
            )}
          </dd>
        </div>
      </dl>
      <div className="mt-auto pt-4">
        <p className="mb-3 text-sm text-muted-foreground">
          {t("doctors.fee")} <span className="block text-lg font-bold text-foreground">{lkr(d.fee)}</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/doctors/${d.id}`} className={btnClass("outline", "h-10 text-sm")}>{t("doctors.viewProfile")}</Link>
          {nextSlot ? (
            <Link href={`/doctors/${d.id}?date=${dateLK(nextSlot)}`} className={btnClass("primary", "h-10 text-sm")} aria-label={`${t("doctors.bookNow")} — ${d.name}`}>
              {t("doctors.bookNow")}
            </Link>
          ) : (
            <span className={btnClass("outline", "h-10 text-sm opacity-50")} aria-disabled="true">{t("doctors.bookNow")}</span>
          )}
        </div>
      </div>
    </Card>
  );
}

export function DoctorCardSkeleton() {
  return (
    <Card className="space-y-3 p-4">
      <div className="flex gap-3">
        <Skeleton className="size-18" />
        <div className="flex-1 space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
      </div>
      <Skeleton className="h-20" />
      <Skeleton className="h-10" />
    </Card>
  );
}

/** Wrapping, keyboard-navigable grid of candidate dates (radio group). */
export function DateStrip({ dates, value, onChange, label }) {
  const { t, lang } = useT();
  const today = todayLK();
  const tomorrow = addDays(today, 1);
  const onKey = (e, i) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    const n = i + (step ?? 0);
    if (!step || n < 0 || n >= dates.length) return;
    e.preventDefault();
    onChange(dates[n]);
    e.currentTarget.parentElement.children[n]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2">
      {dates.map((d, i) => {
        const p = dateParts(d, lang);
        const selected = value === d;
        const near = d === today || d === tomorrow;
        return (
          <button
            type="button"
            key={d}
            role="radio"
            aria-checked={selected}
            aria-label={fmtDate(d, lang)}
            tabIndex={selected || (!dates.includes(value) && i === 0) ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => onChange(d)}
            className={cn(
              "flex flex-col items-center rounded-xl border px-1 py-2.5 transition-colors",
              selected ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-input bg-card hover:border-primary hover:bg-accent",
            )}
          >
            <span className={cn("text-xs font-semibold uppercase tracking-wide", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>{p.weekday}</span>
            <span className="font-display text-2xl font-bold leading-tight">{p.day}</span>
            <span className={cn("text-xs font-medium", selected ? "text-primary-foreground/80" : near ? "text-primary" : "text-muted-foreground")}>
              {d === today ? t("profile.today") : d === tomorrow ? t("profile.tomorrow") : p.month}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const PERIODS = [
  { key: "morning", icon: Sunrise, test: (h) => h < 12 },
  { key: "afternoon", icon: Sun, test: (h) => h >= 12 && h < 17 },
  { key: "evening", icon: Moon, test: (h) => h >= 17 },
];

/** Slots for one day, grouped into morning / afternoon / evening. Past slots are hidden; booked ones are disabled. */
export function SlotGrid({ slots: all, value, onChange, loading }) {
  const slots = all?.filter((s) => s.status !== "past");
  const { t, lang } = useT();
  if (loading)
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-11" />)}
      </div>
    );
  if (!slots?.length)
    return (
      <p className="flex items-center gap-2 rounded-xl bg-muted p-4 text-muted-foreground">
        <CalendarX className="size-5 shrink-0" aria-hidden />
        {t("profile.noSlotsDay")}
      </p>
    );
  const free = slots.filter((s) => s.status === "available").length;
  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">{t("profile.slots")}</legend>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold">{t("profile.slotsLeft", { count: free })}</span>
        <span className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground" aria-hidden>
          <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded border border-input bg-card" />{t("profile.available")}</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-primary" />{t("profile.selected")}</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded border border-border bg-muted" />{t("profile.booked")}</span>
        </span>
      </div>
      {PERIODS.map(({ key, icon: Icon, test }) => {
        const group = slots.filter((s) => test(hourLK(s.slot_start)));
        if (!group.length) return null;
        return (
          <div key={key}>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Icon className="size-4" aria-hidden />
              {t(`profile.${key}`)}
            </h4>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
              {group.map((s) => {
                const selected = value === s.slot_start;
                const open = s.status === "available";
                return (
                  <button
                    type="button"
                    key={s.slot_start}
                    disabled={!open}
                    onClick={() => onChange(s.slot_start)}
                    aria-pressed={selected}
                    aria-label={`${fmtTime(s.slot_start, lang)}, ${t(`profile.${s.status}`)}`}
                    className={cn(
                      "h-11 rounded-lg border text-sm font-semibold tabular-nums transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground shadow-md"
                        : open
                          ? "border-input bg-card hover:border-primary hover:bg-accent"
                          : "cursor-not-allowed border-transparent bg-muted text-muted-foreground/70 line-through",
                    )}
                  >
                    {fmtTime(s.slot_start, lang)}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}
