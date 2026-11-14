"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Baby,
  Bone,
  Brain,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Ear,
  Eye,
  FileDown,
  FlaskConical,
  Hand,
  HeartHandshake,
  HeartPulse,
  KeyRound,
  Languages,
  MousePointerClick,
  Search,
  ShieldCheck,
  Smile,
  Stethoscope,
} from "lucide-react";
import { SiteLayout } from "@/components/layout";
import hero from "@/assets/hero-doctor.jpg";
import care from "@/assets/about.jpg";
import { btnClass } from "@/components/kit";
import { useT } from "@/i18n";
import { useSpecialties } from "@/lib/data";
import { specName } from "@/lib/utils";
import { searchSchema } from "@/lib/validation";

const SPEC_ICONS = {
  Cardiology: HeartPulse,
  Paediatrics: Baby,
  Dermatology: Hand,
  Neurology: Brain,
  "Obstetrics & Gynaecology": HeartHandshake,
  "General Medicine": Stethoscope,
  ENT: Ear,
  Orthopaedics: Bone,
  Psychiatry: Smile,
  Ophthalmology: Eye,
};

function SectionHead({ title, sub, action }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-extrabold sm:text-3xl">{title}</h2>
        {sub && <p className="mt-2 text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function Hero({ specialties }) {
  const { t, lang } = useT();
  const router = useRouter();
  const [q, setQ] = useState("");
  const popular = specialties.slice(0, 4);
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 size-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-24 top-40 size-96 rounded-full bg-secondary/15 blur-3xl" />
      </div>
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 lg:grid-cols-[1.05fr_1fr] lg:py-16">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-teal-soft px-3 py-1 text-sm font-semibold text-secondary">
            <ShieldCheck className="size-4" aria-hidden />
            {t("home.badge")}
          </p>
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-[3.4rem]">
            <span className="bg-hero bg-clip-text text-transparent">{t("home.title")}</span>
          </h1>
          <p className="mt-4 max-w-lg text-lg text-muted-foreground">{t("home.sub")}</p>
          <form
            role="search"
            className="mt-8 flex flex-col gap-2 rounded-2xl border bg-card p-2 shadow-lg shadow-primary/5 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              const query = searchSchema.catch("").parse(q);
              router.push(query ? `/doctors?q=${encodeURIComponent(query)}` : "/doctors");
            }}
          >
            <label htmlFor="hq" className="sr-only">{t("home.searchPlaceholder")}</label>
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                id="hq"
                type="search"
                value={q}
                maxLength={100}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("home.searchPlaceholder")}
                className="h-12 w-full rounded-xl border-0 bg-transparent pl-11 pr-3 text-base focus-visible:outline-offset-0"
              />
            </div>
            <button type="submit" className={btnClass("primary", "h-12 rounded-xl px-6")}>
              {t("home.findDoctors")}
              <ArrowRight className="size-4" aria-hidden />
            </button>
          </form>
          {popular.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-muted-foreground">{t("home.popular")}</span>
              {popular.map((s) => (
                <Link
                  key={s.id}
                  href={`/doctors?spec=${s.id}`}
                  className="rounded-full border bg-card px-3 py-1 font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  {specName(s, lang)}
                </Link>
              ))}
            </div>
          )}
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
            {["trust1", "trust2", "trust3"].map((k) => (
              <li key={k} className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-5 text-success" aria-hidden />
                {t(`home.${k}`)}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative mx-auto w-full max-w-xl lg:pl-6">
          <div aria-hidden className="absolute -inset-3 rotate-3 rounded-[2rem] bg-hero opacity-20 lg:left-3" />
          <Image
            src={hero}
            alt={t("home.heroAlt")}
            priority
            placeholder="blur"
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="relative aspect-[4/3] w-full rounded-[1.75rem] border-4 border-white object-cover shadow-2xl shadow-primary/20"
          />
          <div className="absolute -left-2 bottom-8 flex items-center gap-3 rounded-2xl bg-card/95 p-3 pr-5 shadow-xl backdrop-blur motion-safe:animate-float sm:-left-6">
            <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
              <CalendarCheck className="size-6" aria-hidden />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">{t("home.cardSlotLabel")}</p>
              <p className="font-bold">{t("home.cardSlotValue")}</p>
            </div>
          </div>
          <div
            className="absolute -right-2 bottom-8 flex items-center gap-3 rounded-2xl bg-card/95 p-3 pr-5 shadow-xl backdrop-blur motion-safe:animate-float sm:-right-5"
            style={{ animationDelay: "-3s" }}
          >
            <span className="grid size-11 place-items-center rounded-xl bg-teal-soft text-secondary">
              <ShieldCheck className="size-6" aria-hidden />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">{t("home.cardSecureLabel")}</p>
              <p className="font-bold">{t("home.cardSecureValue")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats({ specCount }) {
  const { t } = useT();
  const items = [
    { icon: Clock, value: "24/7", label: t("home.statAnytime") },
    { icon: Stethoscope, value: specCount ? `${specCount}+` : "10+", label: t("home.statSpecialties") },
    { icon: Languages, value: "3", label: t("home.statLanguages") },
    { icon: KeyRound, value: "OTP", label: t("home.statSecure") },
  ];
  return (
    <section aria-label={t("home.statsLabel")} className="mx-auto max-w-7xl px-4">
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border shadow-sm lg:grid-cols-4">
        {items.map(({ icon: I, value, label }) => (
          <li key={label} className="flex items-center gap-4 bg-card p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-primary">
              <I className="size-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-display text-2xl font-extrabold">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function QuickActions() {
  const { t } = useT();
  const cards = [
    { href: "/doctors", icon: Stethoscope, tone: "bg-accent text-primary", title: t("home.findTitle"), text: t("home.findText") },
    { href: "/dashboard", icon: CalendarCheck, tone: "bg-teal-soft text-secondary", title: t("home.apptTitle"), text: t("home.apptText") },
    { href: "/login?tab=lab", icon: FlaskConical, tone: "bg-warning-soft text-warning", title: t("home.labTitle"), text: t("home.labText") },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16">
      <SectionHead title={t("home.quickTitle")} />
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map(({ href, icon: I, tone, title, text }) => (
          <Link
            key={href}
            href={href}
            className="group card-surface flex h-full flex-col p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
          >
            <span className={`grid size-14 place-items-center rounded-2xl ${tone}`}>
              <I className="size-7" aria-hidden />
            </span>
            <h3 className="mt-5 text-lg font-bold">{title}</h3>
            <p className="mt-1 flex-1 text-muted-foreground">{text}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
              {t("home.open")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Specialties({ specialties, loading }) {
  const { t, lang } = useT();
  return (
    <section className="mx-auto max-w-7xl px-4 pt-20">
      <SectionHead
        title={t("home.specTitle")}
        sub={t("home.specSub")}
        action={
          <Link href="/doctors" className={btnClass("outline")}>
            {t("home.viewAll")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      />
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {loading
          ? Array.from({ length: 10 }, (_, i) => <li key={i} className="h-32 animate-pulse rounded-xl bg-muted" />)
          : specialties.map((s) => {
              const I = SPEC_ICONS[s.name_en] ?? Stethoscope;
              return (
                <li key={s.id}>
                  <Link
                    href={`/doctors?spec=${s.id}`}
                    className="group card-surface flex h-full flex-col items-center gap-3 p-5 text-center transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                  >
                    <span className="grid size-14 place-items-center rounded-full bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <I className="size-7" aria-hidden />
                    </span>
                    <span className="font-semibold leading-snug">{specName(s, lang)}</span>
                  </Link>
                </li>
              );
            })}
      </ul>
    </section>
  );
}

function HowItWorks() {
  const { t } = useT();
  const steps = [
    { icon: Search, title: t("home.step1Title"), text: t("home.step1Text") },
    { icon: MousePointerClick, title: t("home.step2Title"), text: t("home.step2Text") },
    { icon: ShieldCheck, title: t("home.step3Title"), text: t("home.step3Text") },
  ];
  return (
    <section className="mt-20 bg-card py-16">
      <div className="mx-auto max-w-7xl px-4">
        <SectionHead title={t("home.howTitle")} />
        <ol className="grid gap-8 md:grid-cols-3">
          {steps.map(({ icon: I, title, text }, i) => (
            <li key={title} className="relative">
              {i < steps.length - 1 && (
                <span aria-hidden className="absolute left-16 right-0 top-7 hidden border-t-2 border-dashed border-primary/25 md:block" />
              )}
              <span className="relative grid size-14 place-items-center rounded-2xl bg-hero text-white shadow-lg shadow-primary/20">
                <I className="size-7" aria-hidden />
                <span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full border-2 border-card bg-foreground text-xs font-bold text-background">
                  {i + 1}
                </span>
              </span>
              <h3 className="mt-5 text-lg font-bold">{title}</h3>
              <p className="mt-1 max-w-xs text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function LabCta() {
  const { t } = useT();
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16">
      <div className="relative overflow-hidden rounded-3xl bg-hero p-8 text-white sm:p-12">
        <div aria-hidden className="absolute -right-16 -top-16 size-64 rounded-full bg-white/10" />
        <div aria-hidden className="absolute -bottom-20 right-32 size-48 rounded-full bg-white/10" />
        <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
              <FileDown className="size-4" aria-hidden />
              PDF
            </span>
            <h2 className="mt-4 text-2xl font-extrabold sm:text-3xl">{t("home.labCtaTitle")}</h2>
            <p className="mt-2 text-white/85">{t("home.labCtaText")}</p>
            <Link
              href="/login?tab=lab"
              className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 font-semibold text-primary transition-colors hover:bg-white/90"
            >
              {t("home.labCtaBtn")}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <Image
            src={care}
            alt={t("home.labArtAlt")}
            placeholder="blur"
            sizes="(min-width: 768px) 24rem, 100vw"
            className="mx-auto aspect-[4/3] w-full max-w-sm rounded-2xl border-4 border-white/30 object-cover shadow-2xl md:w-96"
          />
        </div>
      </div>
    </section>
  );
}

export default function HomeClient() {
  const { t } = useT();
  const specialties = useSpecialties();
  const list = specialties.data ?? [];
  return (
    <SiteLayout>
      <Hero specialties={list} />
      <Stats specCount={list.length} />
      <QuickActions />
      <Specialties specialties={list} loading={specialties.isLoading} />
      <HowItWorks />
      <LabCta />
      <p className="mx-auto mt-10 max-w-7xl px-4 text-sm text-muted-foreground">
        {t("home.staff")}{" "}
        <Link href="/doctor" className="text-primary underline">{t("home.doctorDash")}</Link>
        {" · "}
        <Link href="/admin" className="text-primary underline">{t("home.adminDash")}</Link>
      </p>
    </SiteLayout>
  );
}
