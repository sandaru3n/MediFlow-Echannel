"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarCheck, Check, FlaskConical, Languages, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";
import { Alert, Button, Card, Field, Input, Select, btnClass } from "@/components/kit";
import { SiteHeader } from "@/components/layout";
import { ContactInput, OtpStep, parseContact } from "@/components/otp";
import { LANGS, useT } from "@/i18n";
import { api, errorText } from "@/lib/api";
import { homeFor, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { registerSchema } from "@/lib/validation";
import { getSupabase } from "@/integrations/supabase/client";

const safeNext = (n) => (n && n.startsWith("/") && !n.startsWith("//") ? n : null);

export default function RegisterClient() {
  const { t } = useT();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { user, roles, loading } = useAuth();
  const [step, setStep] = useState("details");

  const benefits = [
    [CalendarCheck, t("register.b1")],
    [RefreshCw, t("register.b2")],
    [FlaskConical, t("register.b3")],
    [Languages, t("register.b4")],
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main" tabIndex={-1} className="mx-auto grid w-full max-w-5xl flex-1 items-start gap-8 px-4 py-8 outline-none sm:py-12 lg:grid-cols-[1fr_minmax(0,28rem)]">
        <section aria-labelledby="benefits-h" className="hidden rounded-2xl bg-hero p-8 text-primary-foreground lg:block">
          <UserPlus className="size-10 opacity-90" aria-hidden />
          <h2 id="benefits-h" className="mt-4 text-3xl font-bold">{t("register.benefitsTitle")}</h2>
          <p className="mt-2 text-primary-foreground/85">{t("register.benefitsSub")}</p>
          <ul className="mt-8 space-y-4">
            {benefits.map(([Icon, text]) => (
              <li key={text} className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/15"><Icon className="size-5" aria-hidden /></span>
                <span className="pt-1.5 font-medium">{text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-10 flex items-center gap-2 text-sm text-primary-foreground/85">
            <ShieldCheck className="size-4" aria-hidden />
            {t("register.secure")}
          </p>
        </section>

        <div className="mx-auto w-full max-w-md lg:col-start-2 lg:max-w-none">
          <Card className="p-6 sm:p-8">
            {loading ? null : user && step === "details" ? (
              <div className="space-y-4 text-center">
                <h1 className="text-2xl font-bold">{t("login.signedIn")}</h1>
                <Link href={homeFor(roles)} className={btnClass("primary", "w-full")}>{t("login.goDashboard")}</Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <h1 className="text-2xl font-bold">{t("register.title")}</h1>
                  <p className="mt-1 text-muted-foreground">{t("register.sub")}</p>
                </div>
                <Steps current={step === "details" ? 1 : 2} />
                <RegisterFlow next={next} onStep={setStep} />
              </div>
            )}
          </Card>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("register.haveAccount")}{" "}
            <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-primary hover:underline">
              {t("register.signIn")}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function Steps({ current }) {
  const { t } = useT();
  const items = [t("register.stepDetails"), t("register.stepVerify")];
  return (
    <ol className="flex items-center gap-3 text-sm" aria-label={t("register.progress")}>
      {items.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                done || active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {done ? <Check className="size-4" aria-hidden /> : n}
            </span>
            <span className={cn("font-semibold", active ? "text-foreground" : "text-muted-foreground")}>{label}</span>
            {n < items.length && <span className="h-px flex-1 bg-border" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

function RegisterFlow({ next, onStep }) {
  const { t, lang, setLang } = useT();
  const router = useRouter();
  const { refresh } = useAuth();
  const [raw, setRaw] = useState({ type: "phone", value: "" });
  const [contact, setContact] = useState(null);
  const [details, setDetails] = useState(null);
  const [contactErr, setContactErr] = useState();
  const [formErr, setFormErr] = useState();
  const [devCode, setDevCode] = useState();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerSchema), defaultValues: { fullName: "", language: lang, agree: false } });

  const send = (c) => api("/api/auth/otp/request", { body: { contact: c } });

  const onSubmit = (e) => {
    const r = parseContact(raw);
    setContactErr(r.error ? t(r.error) : undefined);
    setFormErr(undefined);
    return handleSubmit(async (v) => {
      if (r.error) return;
      try {
        const res = await send(r.contact);
        setContact(r.contact);
        setDetails(v);
        setDevCode(res.devCode);
        onStep("verify");
      } catch (err) {
        setFormErr(errorText(t, err));
      }
    })(e);
  };

  const onVerify = async (code) => {
    const { tokenHash } = await api("/api/auth/otp/verify", { body: { contact, code, language: details.language } });
    const sb = getSupabase();
    const { data, error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    if (error) throw error;
    const uid = data.user.id;
    const { data: existing } = await sb.from("profiles").select("full_name").eq("id", uid).maybeSingle();
    if (existing?.full_name) {
      toast.info(t("register.exists"));
    } else {
      await sb.from("profiles").update({ full_name: details.fullName, language: details.language }).eq("id", uid);
      toast.success(t("register.welcome", { name: details.fullName }));
    }
    setLang(details.language);
    await refresh(data.user);
    const { data: r } = await sb.from("user_roles").select("role").eq("user_id", uid);
    router.replace(next ?? homeFor((r ?? []).map((x) => x.role)));
    router.refresh();
  };

  if (contact)
    return (
      <OtpStep
        contact={contact}
        devCode={devCode}
        verifyLabel={t("register.verifyBtn")}
        onChangeContact={() => {
          setContact(null);
          onStep("details");
        }}
        onVerify={onVerify}
        onResend={() => send(contact)}
      />
    );

  return (
    <form className="space-y-5" noValidate onSubmit={onSubmit}>
      <Field id="reg-name" label={t("register.fullName")} error={errors.fullName && t(errors.fullName.message)}>
        <Input id="reg-name" autoComplete="name" placeholder={t("register.namePlaceholder")} invalid={!!errors.fullName} {...register("fullName")} />
      </Field>
      <ContactInput idPrefix="reg" contact={raw} setContact={setRaw} error={contactErr} />
      <Field id="reg-lang" label={t("register.language")}>
        <Select id="reg-lang" {...register("language")}>
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </Select>
      </Field>
      <div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" aria-invalid={!!errors.agree || undefined} {...register("agree")} />
          <span>
            {t("register.agreeA")}{" "}
            <Link href="/terms" target="_blank" className="font-semibold text-primary hover:underline">{t("footer.terms")}</Link>{" "}
            {t("register.agreeAnd")}{" "}
            <Link href="/privacy" target="_blank" className="font-semibold text-primary hover:underline">{t("footer.privacy")}</Link>.
          </span>
        </label>
        {errors.agree && <p role="alert" className="mt-1.5 text-sm font-medium text-destructive">{t(errors.agree.message)}</p>}
      </div>
      {formErr && <Alert tone="error">{formErr}</Alert>}
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        <UserPlus className="size-4" aria-hidden />
        {t("register.createBtn")}
      </Button>
    </form>
  );
}
