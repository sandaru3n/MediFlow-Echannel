"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { SiteLayout } from "@/components/layout";
import { Alert, Button, Card, Field, Input, Textarea } from "@/components/kit";
import { contactFormSchema } from "@/lib/validation";
import { api, errorText } from "@/lib/api";
import { useT } from "@/i18n";

// Fill in verified details; null values render as "To be added".
const INFO = { address: null, phone: null, email: null, hours: null };

export default function ContactClient() {
  const { t } = useT();
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(contactFormSchema), defaultValues: { name: "", email: "", subject: "", message: "", website: "" } });
  const e = (k) => errors[k] && t(errors[k].message);
  const msgLen = watch("message")?.length ?? 0;

  const submit = async (v) => {
    setFailed(undefined);
    try {
      await api("/api/contact", { body: v });
      setSent(true);
      reset();
      toast.success(t("contact.sent"));
    } catch (err) {
      setFailed(err.code === "rate_limited" ? errorText(t, err) : t("contact.failed"));
    }
  };

  const tba = <span className="italic text-muted-foreground">{t("contact.tba")}</span>;
  const cards = [
    { icon: MapPin, label: t("contact.address"), value: INFO.address },
    { icon: Phone, label: t("contact.phone"), value: INFO.phone && <a href={`tel:${INFO.phone}`} className="hover:text-primary">{INFO.phone}</a> },
    { icon: Mail, label: t("contact.email"), value: INFO.email && <a href={`mailto:${INFO.email}`} className="hover:text-primary">{INFO.email}</a> },
    { icon: Clock, label: t("contact.hours"), value: INFO.hours },
  ];

  return (
    <SiteLayout>
      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <h1 className="text-4xl font-extrabold">{t("contact.title")}</h1>
          <p className="mt-3 max-w-xl text-lg opacity-90">{t("contact.sub")}</p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ icon: I, label, value }) => (
            <Card key={label} className="p-5">
              <I className="size-6 text-primary" aria-hidden />
              <h2 className="mt-3 font-bold">{label}</h2>
              <p className="mt-1">{value ?? tba}</p>
            </Card>
          ))}
        </div>
        <Card className="mx-auto max-w-2xl p-6">
          <h2 className="mb-4 text-xl font-bold">{t("contact.formTitle")}</h2>
          <Alert tone="warning" title={t("contact.noMedical")} className="mb-4">{t("contact.noMedicalText")}</Alert>
          {sent ? (
            <Alert tone="success" title={t("contact.sent")} action={<Button variant="outline" size="sm" className="mt-2" onClick={() => setSent(false)}>{t("contact.formTitle")}</Button>}>
              {t("contact.sentText")}
            </Alert>
          ) : (
            <form noValidate onSubmit={handleSubmit(submit)} className="space-y-4">
              <Field id="c-name" label={t("contact.name")} error={e("name")}>
                <Input id="c-name" autoComplete="name" maxLength={80} invalid={!!errors.name} {...register("name")} />
              </Field>
              <Field id="c-email" label={t("contact.emailField")} error={e("email")}>
                <Input id="c-email" type="email" autoComplete="email" maxLength={254} invalid={!!errors.email} {...register("email")} />
              </Field>
              <Field id="c-subject" label={t("contact.subject")} error={e("subject")}>
                <Input id="c-subject" maxLength={120} invalid={!!errors.subject} {...register("subject")} />
              </Field>
              <Field id="c-message" label={t("contact.message")} hint={`${msgLen}/1000`} error={e("message")}>
                <Textarea id="c-message" rows={5} maxLength={1000} invalid={!!errors.message} {...register("message")} />
              </Field>
              <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" {...register("website")} />
              {failed && <Alert tone="error">{failed}</Alert>}
              <Button type="submit" size="lg" loading={isSubmitting}>{isSubmitting ? t("contact.sending") : t("contact.send")}</Button>
            </form>
          )}
        </Card>
      </div>
    </SiteLayout>
  );
}
