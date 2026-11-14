"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarCheck, Eye, FileText, FlaskConical, Languages, LayoutDashboard, Search, Target } from "lucide-react";
import { SiteLayout } from "@/components/layout";
import { Card, btnClass } from "@/components/kit";
import { useT } from "@/i18n";
import about from "@/assets/about.jpg";

export default function AboutClient() {
  const { t } = useT();
  const offers = [
    [Search, "o1"],
    [CalendarCheck, "o2"],
    [FlaskConical, "o3"],
    [LayoutDashboard, "o4"],
    [Languages, "o5"],
  ];
  return (
    <SiteLayout>
      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <h1 className="text-4xl font-extrabold sm:text-5xl">{t("about.title")}</h1>
          <p className="mt-4 max-w-2xl text-lg opacity-90">{t("about.sub")}</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">{t("about.storyTitle")}</h2>
          <p className="text-lg text-muted-foreground">{t("about.story1")}</p>
          <p className="text-muted-foreground">{t("about.story2")}</p>
        </div>
        <Image src={about} alt={t("about.imgAlt")} placeholder="blur" sizes="(min-width: 1024px) 50vw, 100vw" className="aspect-[4/3] w-full rounded-2xl object-cover" />
      </section>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 md:grid-cols-2">
        <Card className="p-8">
          <Target className="size-9 text-primary" aria-hidden />
          <h2 className="mt-4 text-2xl font-bold">{t("about.mission")}</h2>
          <p className="mt-2 text-muted-foreground">{t("about.missionText")}</p>
        </Card>
        <Card className="p-8">
          <Eye className="size-9 text-secondary" aria-hidden />
          <h2 className="mt-4 text-2xl font-bold">{t("about.vision")}</h2>
          <p className="mt-2 text-muted-foreground">{t("about.visionText")}</p>
        </Card>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="mb-8 text-center text-3xl font-bold">{t("about.offer")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {offers.map(([Icon, k]) => (
            <Card key={k} className="p-5">
              <span className="grid size-11 place-items-center rounded-lg bg-accent text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-3 font-bold">{t(`about.${k}`)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t(`about.${k}t`)}</p>
            </Card>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4">
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <FileText className="size-10 text-secondary" aria-hidden />
          <h2 className="text-2xl font-bold">{t("about.ready")}</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/doctors" className={btnClass("primary", "h-13 px-6")}>{t("about.findDoctor")}</Link>
            <Link href="/contact" className={btnClass("outline", "h-13 px-6")}>{t("about.contactUs")}</Link>
          </div>
        </Card>
      </section>
    </SiteLayout>
  );
}
