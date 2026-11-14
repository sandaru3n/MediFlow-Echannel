"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth";
import { Card, Spinner, btnClass } from "./kit";

/**
 * Client-side gate for dashboards. Real enforcement is Postgres RLS — this only avoids
 * rendering a page the user can't use.
 */
export function RequireRole({ role, children }) {
  const { t } = useT();
  const { user, roles, loading } = useAuth();
  if (loading) return <Spinner label={t("common.loading")} />;
  if (!user)
    return (
      <Gate title={t("dash.signInNeeded")}>
        <Link href="/login" className={btnClass("primary")}>{t("common.signIn")}</Link>
      </Gate>
    );
  if (role && !roles.includes(role) && !roles.includes("admin"))
    return (
      <Gate title={t("dash.noAccess")}>
        <Link href="/" className={btnClass("outline")}>{t("dash.goHome")}</Link>
      </Gate>
    );
  return children;
}

function Gate({ title, children }) {
  return (
    <main id="main" className="grid min-h-screen place-items-center p-4">
      <Card className="flex max-w-md flex-col items-center gap-4 p-8 text-center">
        <ShieldAlert className="size-10 text-primary" aria-hidden />
        <p className="text-lg font-semibold">{title}</p>
        {children}
      </Card>
    </main>
  );
}
