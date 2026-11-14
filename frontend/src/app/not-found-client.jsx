"use client";

import Link from "next/link";
import { SearchX } from "lucide-react";
import { SiteLayout } from "@/components/layout";
import { btnClass } from "@/components/kit";
import { useT } from "@/i18n";

export default function NotFoundClient() {
  const { t } = useT();
  return (
    <SiteLayout>
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
        <SearchX className="size-14 text-primary" aria-hidden />
        <p className="font-display text-6xl font-extrabold text-primary">404</p>
        <h1 className="text-2xl font-bold">{t("notFound.title")}</h1>
        <p className="text-muted-foreground">{t("notFound.text")}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className={btnClass("primary")}>{t("notFound.home")}</Link>
          <Link href="/doctors" className={btnClass("outline")}>{t("nav.findDoctors")}</Link>
        </div>
      </div>
    </SiteLayout>
  );
}
