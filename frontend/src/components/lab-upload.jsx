"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FlaskConical, Trash2, Upload } from "lucide-react";
import { Alert, Button, Card, EmptyState, ErrorState, Field, Input, Select, Skeleton } from "./kit";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth";
import { labFileSchema, labUploadSchema } from "@/lib/validation";
import { getSupabase } from "@/integrations/supabase/client";
import { openReport } from "@/lib/data";
import { errorText } from "@/lib/api";
import { fmtDate, fmtDateTime } from "@/lib/utils";
/**
 * Upload a lab report PDF into the private bucket and register it.
 * The DB row is created first so a duplicate invoice fails before any file is stored;
 * if the file upload then fails, the row is rolled back.
 */
export function LabUploadForm({ appointments = [], onUploaded }) {
  const { t, lang } = useT();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [file, setFile] = useState(null);
  const [fileErr, setFileErr] = useState();
  const [formErr, setFormErr] = useState();
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(labUploadSchema), defaultValues: { invoice_number: "", test_name: "", patient_name: "", patient_phone: "", patient_email: "", appointment_id: "" } });
  const e = (k) => errors[k] && t(errors[k].message);

  const pickAppointment = (id) => {
    const a = appointments.find((x) => x.id === id);
    if (!a) return;
    setValue("patient_name", a.patient_name ?? "");
    setValue("patient_phone", a.patient_phone ? a.patient_phone.replace(/^\+94/, "0") : "");
    setValue("patient_email", a.patient_email ?? "");
  };

  const onSubmit = async (v) => {
    setFormErr(undefined);
    const f = labFileSchema.safeParse(file);
    if (!f.success) return setFileErr(t(f.error.issues[0].message));
    setFileErr(undefined);
    const sb = getSupabase();
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.pdf`;
    const { data: row, error } = await sb
      .from("lab_reports")
      .insert({ ...v, file_path: path, uploaded_by: user.id })
      .select("id")
      .single();
    if (error) return setFormErr(error.code === "23505" ? t("errors.invoice_exists") : t("common.errorGeneric"));
    const up = await sb.storage.from("lab-reports").upload(path, file, { contentType: "application/pdf", upsert: false });
    if (up.error) {
      await sb.from("lab_reports").delete().eq("id", row.id);
      return setFormErr(t("common.errorGeneric"));
    }
    toast.success(t("doctorDash.uploadedOk"));
    reset();
    setFile(null);
    qc.invalidateQueries({ queryKey: ["staff-reports"] });
    onUploaded?.();
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold">{t("doctorDash.uploadReport")}</h2>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("doctorDash.uploadHint")}</p>
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        {appointments.length > 0 && (
          <div className="sm:col-span-2">
            <Field id="lr-appt" label={t("doctorDash.linkAppointment")} optionalLabel={t("common.optional")}>
              <Select id="lr-appt" {...register("appointment_id", { onChange: (ev) => pickAppointment(ev.target.value) })}>
                <option value="">—</option>
                {appointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.reference} · {a.patient_name} · {fmtDateTime(a.slot_start, lang)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}
        <Field id="lr-inv" label={t("doctorDash.invoiceNumber")} hint={t("login.invoiceHint")} error={e("invoice_number")}>
          <Input id="lr-inv" autoComplete="off" invalid={!!errors.invoice_number} {...register("invoice_number", { setValueAs: (x) => String(x).toUpperCase() })} />
        </Field>
        <Field id="lr-test" label={t("doctorDash.testName")} error={e("test_name")}>
          <Input id="lr-test" invalid={!!errors.test_name} {...register("test_name")} />
        </Field>
        <Field id="lr-name" label={t("doctorDash.patientName")} optionalLabel={t("common.optional")} error={e("patient_name")}>
          <Input id="lr-name" invalid={!!errors.patient_name} {...register("patient_name")} />
        </Field>
        <Field id="lr-phone" label={t("doctorDash.patientPhone")} hint={t("booking.phoneHint")} error={e("patient_phone")}>
          <Input id="lr-phone" type="tel" invalid={!!errors.patient_phone} {...register("patient_phone")} />
        </Field>
        <Field id="lr-email" label={t("doctorDash.patientEmail")} optionalLabel={t("common.optional")} error={e("patient_email")}>
          <Input id="lr-email" type="email" invalid={!!errors.patient_email} {...register("patient_email")} />
        </Field>
        <Field id="lr-file" label={t("doctorDash.file")} hint={t("doctorDash.fileHint")} error={fileErr}>
          <input
            id="lr-file"
            type="file"
            accept="application/pdf"
            onChange={(ev) => {
              const picked = ev.target.files?.[0] ?? null;
              const r = picked ? labFileSchema.safeParse(picked) : null;
              setFile(picked);
              setFileErr(r && !r.success ? t(r.error.issues[0].message) : undefined);
            }}
            className="block w-full rounded-lg border border-input bg-card p-2.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:font-semibold file:text-accent-foreground"
          />
        </Field>
        {formErr && <div className="sm:col-span-2"><Alert tone="error">{formErr}</Alert></div>}
        <div className="sm:col-span-2">
          <Button type="submit" loading={isSubmitting}>
            <Upload className="size-4" aria-hidden />
            {isSubmitting ? t("doctorDash.uploading") : t("doctorDash.upload")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Reports visible to the signed-in staff member (RLS limits doctors to their own uploads / patients). */
export function StaffReports({ canDelete = false }) {
  const { t, lang } = useT();
  const qc = useQueryClient();
  const [opening, setOpening] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["staff-reports"],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("lab_reports")
        .select("id, invoice_number, test_name, patient_name, patient_phone, patient_email, file_path, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const download = async (r) => {
    setOpening(r.id);
    try {
      await openReport(r.file_path, r.invoice_number);
    } catch (err) {
      toast.error(errorText(t, err));
    } finally {
      setOpening(null);
    }
  };

  const remove = async (e) => {
    e.preventDefault();
    setBusy(true);
    const sb = getSupabase();
    const { error } = await sb.from("lab_reports").delete().eq("id", toDelete.id);
    if (!error) await sb.storage.from("lab-reports").remove([toDelete.file_path]);
    setBusy(false);
    if (error) return toast.error(t("common.errorGeneric"));
    toast.success(t("common.deleted"));
    setToDelete(null);
    qc.invalidateQueries({ queryKey: ["staff-reports"] });
  };

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-xl font-bold">{t("doctorDash.recentUploads")}</h2>
      {q.isLoading ? (
        <Skeleton className="h-32" />
      ) : q.isError ? (
        <ErrorState message={t("common.errorGeneric")} onRetry={q.refetch} retryLabel={t("common.tryAgain")} />
      ) : !q.data.length ? (
        <EmptyState icon={<FlaskConical className="size-10" />} title={t("doctorDash.noUploads")} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-muted">
              <tr>
                <th scope="col" className="p-3">{t("dash.invoice")}</th>
                <th scope="col" className="p-3">{t("dash.test")}</th>
                <th scope="col" className="p-3">{t("doctorDash.patient")}</th>
                <th scope="col" className="p-3">{t("dash.uploaded")}</th>
                <th scope="col" className="p-3"><span className="sr-only">{t("common.actions")}</span></th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 font-mono">{r.invoice_number}</td>
                  <td className="p-3 font-semibold">{r.test_name}</td>
                  <td className="p-3">
                    {r.patient_name || "—"}
                    <span className="block text-xs text-muted-foreground">{r.patient_phone || r.patient_email}</span>
                  </td>
                  <td className="p-3">{fmtDate(r.created_at, lang)}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" loading={opening === r.id} onClick={() => download(r)} aria-label={`${t("common.download")} ${r.invoice_number}`}>
                        <Download className="size-4" aria-hidden />
                      </Button>
                      {canDelete && (
                        <Button size="sm" variant="ghost" onClick={() => setToDelete(r)} aria-label={`${t("common.delete")} ${r.invoice_number}`}>
                          <Trash2 className="size-4 text-destructive" aria-hidden />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.deleteTitle", { name: toDelete?.invoice_number })}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.deleteText")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={remove} disabled={busy}>{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
