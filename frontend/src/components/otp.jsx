"use client";

import { useEffect, useRef, useState } from "react";
import { Mail, Phone, RotateCw } from "lucide-react";
import { Alert, Button, Field, Input } from "./kit";
import { useT } from "@/i18n";
import { cn, maskContact } from "@/lib/utils";
import { contactSchema, otpCodeSchema } from "@/lib/validation";
import { errorText } from "@/lib/api";

const TTL = 300;
const COOLDOWN = 30;

export function OtpInput({ value, onChange, invalid, id }) {
  const { t } = useT();
  const refs = useRef([]);
  const set = (i, ch) => {
    const arr = value.padEnd(6, " ").split("");
    arr[i] = ch || " ";
    onChange(arr.join("").replace(/\s+$/, ""));
  };
  return (
    <div className="flex justify-between gap-2" role="group" aria-labelledby={`${id}-label`}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          id={i === 0 ? id : undefined}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={6}
          aria-label={t("login.digit", { n: i + 1 })}
          aria-invalid={invalid || undefined}
          value={value[i]?.trim() ?? ""}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (v.length > 1) {
              onChange(v.slice(0, 6));
              refs.current[Math.min(v.length, 5)]?.focus();
              return;
            }
            set(i, v);
            if (v && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i]?.trim() && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => {
            const v = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (v) {
              e.preventDefault();
              onChange(v);
              refs.current[Math.min(v.length, 5)]?.focus();
            }
          }}
          className={cn("h-14 w-full min-w-0 rounded-lg border border-input bg-card text-center text-2xl font-bold focus-visible:border-primary", invalid && "border-destructive")}
        />
      ))}
    </div>
  );
}

/** Returns { contact } on success or { error: i18nKey }. */
export function parseContact(contact) {
  const r = contactSchema.safeParse(contact);
  return r.success ? { contact: r.data } : { error: r.error.issues[0]?.message ?? "validation.required" };
}

export function ContactInput({ contact, setContact, error, idPrefix, allowPhone = true }) {
  const { t } = useT();
  const id = `${idPrefix}-contact`;
  return (
    <div className="space-y-3">
      {allowPhone && (
        <div role="radiogroup" aria-label={t("login.method")} className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {["phone", "email"].map((type) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={contact.type === type}
              onClick={() => setContact({ type, value: "" })}
              className={cn("flex h-11 items-center justify-center gap-2 rounded-md font-semibold", contact.type === type ? "bg-card text-primary shadow-sm" : "text-muted-foreground")}
            >
              {type === "phone" ? <Phone className="size-4" aria-hidden /> : <Mail className="size-4" aria-hidden />}
              {type === "phone" ? t("login.mobile") : t("login.email")}
            </button>
          ))}
        </div>
      )}
      <Field id={id} label={contact.type === "phone" ? t("login.mobile") : t("login.email")} error={error} hint={contact.type === "phone" ? t("login.phoneHint") : t("login.emailHint")}>
        {contact.type === "phone" ? (
          <div className="flex">
            <span className="inline-flex h-12 items-center rounded-l-lg border border-r-0 border-input bg-muted px-3 font-semibold" aria-hidden>
              +94
            </span>
            <Input
              id={id}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="77 123 4567"
              className="rounded-l-none"
              value={contact.value}
              invalid={!!error}
              aria-describedby={error ? `${id}-err` : `${id}-hint`}
              onChange={(e) => setContact({ ...contact, value: e.target.value.replace(/[^\d\s]/g, "").replace(/^0/, "") })}
            />
          </div>
        ) : (
          <Input
            id={id}
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={contact.value}
            invalid={!!error}
            aria-describedby={error ? `${id}-err` : `${id}-hint`}
            onChange={(e) => setContact({ ...contact, value: e.target.value })}
          />
        )}
      </Field>
    </div>
  );
}

/**
 * Code entry with expiry countdown, resend cooldown and server-side verification.
 * `onVerify(code)` and `onResend()` should throw ApiError on failure; onResend may return { devCode }.
 */
export function OtpStep({ contact, onChangeContact, onVerify, onResend, verifyLabel, devCode: initialDevCode }) {
  const { t } = useT();
  const [code, setCode] = useState("");
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expiry, setExpiry] = useState(TTL);
  const [cooldown, setCooldown] = useState(COOLDOWN);
  const [resent, setResent] = useState(false);
  const [devCode, setDevCode] = useState(initialDevCode);

  useEffect(() => {
    const i = setInterval(() => {
      setExpiry((s) => Math.max(0, s - 1));
      setCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(i);
  }, []);

  const mm = `${Math.floor(expiry / 60)}:${String(expiry % 60).padStart(2, "0")}`;

  const verify = async () => {
    const parsed = otpCodeSchema.safeParse(code);
    if (!parsed.success) return setErr(t(parsed.error.issues[0].message));
    if (expiry === 0) return setErr(t("login.expired"));
    setErr(null);
    setLoading(true);
    try {
      await onVerify(parsed.data);
    } catch (e) {
      setErr(errorText(t, e));
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setErr(null);
    setResent(false);
    try {
      const r = await onResend();
      setDevCode(r?.devCode);
      setCooldown(COOLDOWN);
      setExpiry(TTL);
      setCode("");
      setResent(true);
    } catch (e) {
      setErr(errorText(t, e));
    }
  };

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        verify();
      }}
    >
      <p className="text-muted-foreground">
        {t("login.codeSentTo", { target: maskContact(contact.type, contact.value) })}{" "}
        <button type="button" onClick={onChangeContact} className="font-semibold text-primary underline-offset-2 hover:underline">
          {t("login.change")}
        </button>
      </p>
      {devCode && <Alert tone="warning">{t("login.devCode", { code: devCode })}</Alert>}
      <div>
        <p id="otp-label" className="mb-2 text-sm font-semibold">
          {t("login.enterCode")}
        </p>
        <OtpInput id="otp" value={code} onChange={setCode} invalid={!!err} />
        <p className={cn("mt-2 text-sm", expiry < 60 ? "text-destructive" : "text-muted-foreground")} aria-live="polite">
          {expiry > 0 ? t("login.expiresIn", { time: mm }) : t("login.expired")}
        </p>
      </div>
      {err && <Alert tone="error">{err}</Alert>}
      {resent && !err && <Alert tone="info">{t("login.newCodeSent")}</Alert>}
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        {verifyLabel}
      </Button>
      <Button type="button" variant="ghost" className="w-full" disabled={cooldown > 0} onClick={resend}>
        <RotateCw className="size-4" aria-hidden /> {cooldown > 0 ? t("login.resendIn", { s: cooldown }) : t("login.resend")}
      </Button>
    </form>
  );
}
