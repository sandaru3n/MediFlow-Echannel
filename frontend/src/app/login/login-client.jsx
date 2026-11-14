"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Briefcase, Download, FileText, FlaskConical, HelpCircle, LogIn, ShieldCheck } from "lucide-react";
import { Alert, Button, Card, Field, Input } from "@/components/kit";
import { SiteHeader } from "@/components/layout";
import { ContactInput, OtpStep, parseContact } from "@/components/otp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/i18n";
import { api, errorText } from "@/lib/api";
import { homeFor } from "@/lib/auth";
import { fmtDate } from "@/lib/utils";
import { invoiceSchema, staffLoginSchema } from "@/lib/validation";
import { getSupabase } from "@/integrations/supabase/client";

/** Only allow same-site relative redirects. */
const safeNext = (n) => (n && n.startsWith("/") && !n.startsWith("//") ? n : null);

async function rolesOf(userId) {
  const { data } = await getSupabase().from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role);
}

export default function LoginClient() {
  const { t } = useT();
  const params = useSearchParams();
  const initial = ["patient", "lab", "staff"].includes(params.get("tab")) ? params.get("tab") : "patient";
  const next = safeNext(params.get("next"));
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-md px-4 py-8 outline-none sm:py-12">
        <Card className="p-6 sm:p-8">
          <Tabs defaultValue={initial}>
            <TabsList aria-label={t("login.chooseOption")} className="grid-cols-3">
              <TabsTrigger value="patient"><LogIn className="size-4" aria-hidden />{t("login.tabPatient")}</TabsTrigger>
              <TabsTrigger value="lab"><FlaskConical className="size-4" aria-hidden />{t("login.tabLab")}</TabsTrigger>
              <TabsTrigger value="staff"><Briefcase className="size-4" aria-hidden />{t("login.tabStaff")}</TabsTrigger>
            </TabsList>
            <TabsContent value="patient"><PatientFlow next={next} /></TabsContent>
            <TabsContent value="lab"><LabFlow /></TabsContent>
            <TabsContent value="staff"><StaffFlow next={next} /></TabsContent>
          </Tabs>
        </Card>
        <nav aria-label={t("common.actions")} className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
          <Link href="/privacy" className="text-muted-foreground hover:text-primary">{t("footer.privacy")}</Link>
          <Link href="/terms" className="text-muted-foreground hover:text-primary">{t("footer.terms")}</Link>
          <Link href="/contact" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
            <HelpCircle className="size-4" aria-hidden />
            {t("nav.contact")}
          </Link>
        </nav>
      </main>
    </div>
  );
}

/** Shared "enter contact -> enter code -> session" flow used by patients and staff (email OTP). */
function OtpLogin({ next, allowPhone = true, idPrefix, staff = false }) {
  const { t, lang } = useT();
  const router = useRouter();
  const [step, setStep] = useState("contact");
  const [raw, setRaw] = useState({ type: allowPhone ? "phone" : "email", value: "" });
  const [contact, setContact] = useState(null);
  const [fieldErr, setFieldErr] = useState();
  const [formErr, setFormErr] = useState();
  const [sending, setSending] = useState(false);
  const [devCode, setDevCode] = useState();

  const send = async (c) => api("/api/auth/otp/request", { body: { contact: c } });

  const onSubmit = async (e) => {
    e.preventDefault();
    const r = parseContact(raw);
    setFieldErr(r.error ? t(r.error) : undefined);
    setFormErr(undefined);
    if (r.error) return;
    setSending(true);
    try {
      const res = await send(r.contact);
      setContact(r.contact);
      setDevCode(res.devCode);
      setStep("code");
    } catch (err) {
      setFormErr(errorText(t, err));
    } finally {
      setSending(false);
    }
  };

  const onVerify = async (code) => {
    const { tokenHash } = await api("/api/auth/otp/verify", { body: { contact, code, language: lang } });
    const sb = getSupabase();
    const { data, error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    if (error) throw error;
    const roles = await rolesOf(data.user.id);
    if (staff && !roles.includes("doctor") && !roles.includes("admin")) {
      await sb.auth.signOut();
      setStep("contact");
      setFormErr(t("login.staffOnly"));
      return;
    }
    router.replace(next ?? homeFor(roles));
    router.refresh();
  };

  if (step === "code")
    return (
      <OtpStep
        contact={contact}
        devCode={devCode}
        verifyLabel={t("login.verify")}
        onChangeContact={() => setStep("contact")}
        onVerify={onVerify}
        onResend={() => send(contact)}
      />
    );
  return (
    <form className="space-y-4" noValidate onSubmit={onSubmit}>
      <ContactInput idPrefix={idPrefix} contact={raw} setContact={setRaw} error={fieldErr} allowPhone={allowPhone} />
      {formErr && <Alert tone="error">{formErr}</Alert>}
      <Button type="submit" size="lg" className="w-full" loading={sending}>{t("login.sendCode")}</Button>
    </form>
  );
}

function PatientFlow({ next }) {
  const { t } = useT();
  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t("login.welcome")}</h1>
        <p className="mt-1 text-muted-foreground">{t("login.sub")}</p>
      </div>
      <OtpLogin next={next} idPrefix="patient" />
      <p className="flex flex-wrap items-center justify-center gap-1.5 text-sm text-muted-foreground">
        <ShieldCheck className="size-4 text-secondary" aria-hidden />
        {t("login.noAccount")}
        <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="font-semibold text-primary hover:underline">
          {t("login.createAccount")}
        </Link>
      </p>
    </div>
  );
}

function StaffFlow({ next }) {
  const { t } = useT();
  const router = useRouter();
  const [mode, setMode] = useState("password");
  const [formErr, setFormErr] = useState();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(staffLoginSchema) });

  const onSubmit = async (v) => {
    setFormErr(undefined);
    const sb = getSupabase();
    const { data, error } = await sb.auth.signInWithPassword(v);
    if (error) return setFormErr(t("errors.invalid_credentials"));
    const roles = await rolesOf(data.user.id);
    if (!roles.includes("doctor") && !roles.includes("admin")) {
      await sb.auth.signOut();
      return setFormErr(t("login.staffOnly"));
    }
    router.replace(next ?? homeFor(roles));
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t("login.staffTitle")}</h1>
        <p className="mt-1 text-muted-foreground">{t("login.staffSub")}</p>
      </div>
      {mode === "password" ? (
        <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
          <Field id="staff-email" label={t("login.email")} error={errors.email && t(errors.email.message)}>
            <Input id="staff-email" type="email" autoComplete="email" invalid={!!errors.email} {...register("email")} />
          </Field>
          <Field id="staff-password" label={t("login.password")} error={errors.password && t(errors.password.message)}>
            <Input id="staff-password" type="password" autoComplete="current-password" invalid={!!errors.password} {...register("password")} />
          </Field>
          {formErr && <Alert tone="error">{formErr}</Alert>}
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>{t("login.signInBtn")}</Button>
        </form>
      ) : (
        <OtpLogin next={next} allowPhone={false} idPrefix="staff" staff />
      )}
      <Button variant="ghost" className="w-full" onClick={() => setMode(mode === "password" ? "otp" : "password")}>
        {mode === "password" ? t("login.useOtp") : t("login.usePassword")}
      </Button>
    </div>
  );
}

function LabFlow() {
  const { t, lang } = useT();
  const [step, setStep] = useState("contact");
  const [invoice, setInvoice] = useState("");
  const [invErr, setInvErr] = useState();
  const [raw, setRaw] = useState({ type: "phone", value: "" });
  const [contact, setContact] = useState(null);
  const [fieldErr, setFieldErr] = useState();
  const [formErr, setFormErr] = useState();
  const [sending, setSending] = useState(false);
  const [devCode, setDevCode] = useState();
  const [reports, setReports] = useState(null);

  const request = (inv, c) => api("/api/lab/request", { body: { invoice: inv, contact: c } });

  const onSubmit = async (e) => {
    e.preventDefault();
    const inv = invoiceSchema.safeParse(invoice);
    const c = parseContact(raw);
    setInvErr(inv.success ? undefined : t(inv.error.issues[0].message));
    setFieldErr(c.error ? t(c.error) : undefined);
    setFormErr(undefined);
    if (!inv.success || c.error) return;
    setSending(true);
    try {
      const res = await request(inv.data, c.contact);
      setInvoice(inv.data);
      setContact(c.contact);
      setDevCode(res.devCode);
      setStep("code");
    } catch (err) {
      setFormErr(errorText(t, err));
    } finally {
      setSending(false);
    }
  };

  const onVerify = async (code) => {
    const res = await api("/api/lab/verify", { body: { invoice, contact, code } });
    setReports(res.reports);
    setStep("done");
  };

  const reset = () => {
    setStep("contact");
    setReports(null);
    setInvoice("");
    setRaw({ type: "phone", value: "" });
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t("login.labTitle")}</h1>
        <p className="mt-1 text-muted-foreground">{t("login.labSub")}</p>
      </div>
      {step === "contact" && (
        <form className="space-y-4" noValidate onSubmit={onSubmit}>
          <Field id="inv" label={t("login.invoice")} error={invErr} hint={t("login.invoiceHint")}>
            <Input
              id="inv"
              value={invoice}
              invalid={!!invErr}
              autoComplete="off"
              onChange={(e) => setInvoice(e.target.value.toUpperCase())}
              aria-describedby={invErr ? "inv-err" : "inv-hint"}
            />
          </Field>
          <ContactInput idPrefix="lab" contact={raw} setContact={setRaw} error={fieldErr} />
          {formErr && <Alert tone="error">{formErr}</Alert>}
          <Button type="submit" variant="teal" size="lg" className="w-full" loading={sending}>{t("login.sendCode")}</Button>
        </form>
      )}
      {step === "code" && (
        <OtpStep
          contact={contact}
          devCode={devCode}
          verifyLabel={t("login.verifyLab")}
          onChangeContact={() => setStep("contact")}
          onVerify={onVerify}
          onResend={() => request(invoice, contact)}
        />
      )}
      {step === "done" && (
        <div className="space-y-3" aria-live="polite">
          <h2 className="font-bold">{t("login.yourReports")}</h2>
          {reports?.length ? (
            reports.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <FileText className="size-6 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.testName}</p>
                  <p className="text-sm text-muted-foreground">{r.invoice} · {fmtDate(r.createdAt, lang)}</p>
                </div>
                <a href={r.url} className="inline-flex h-9 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm font-semibold hover:bg-muted">
                  <Download className="size-4" aria-hidden />
                  {t("common.download")}
                </a>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">{t("login.noReports")}</p>
          )}
          <p className="text-xs text-muted-foreground">{t("login.linkExpires")}</p>
          <Button variant="ghost" className="w-full" onClick={reset}>{t("login.clearExit")}</Button>
        </div>
      )}
    </div>
  );
}
