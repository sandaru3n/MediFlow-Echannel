"use client";

import { SiteLayout } from "./layout";
import { Card } from "./kit";
import { useT } from "@/i18n";
import { fmtDate } from "@/lib/utils";

const UPDATED = "2026-11-14";

/** Privacy / Terms page body: a title, intro and numbered sections from the `legal` dictionary. */
export function LegalPage({ titleKey, introKey, prefix }) {
  const { t, lang } = useT();
  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Card as="article" className="space-y-6 p-6 sm:p-10">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold">{t(titleKey)}</h1>
            <p className="text-sm text-muted-foreground">{t("legal.updated", { date: fmtDate(UPDATED, lang) })}</p>
            <p className="text-lg text-muted-foreground">{t(introKey)}</p>
          </header>
          {[1, 2, 3, 4].map((n) => (
            <section key={n} className="space-y-1">
              <h2 className="text-xl font-bold">{n}. {t(`legal.${prefix}${n}t`)}</h2>
              <p className="text-muted-foreground">{t(`legal.${prefix}${n}`)}</p>
            </section>
          ))}
          <p className="rounded-lg bg-warning-soft p-3 text-sm text-warning">{t("legal.placeholder")}</p>
        </Card>
      </div>
    </SiteLayout>
  );
}
