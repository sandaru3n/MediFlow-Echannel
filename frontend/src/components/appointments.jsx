"use client";

import { useState } from "react";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileText, FlaskConical } from "lucide-react";
import { Badge, Button, Card, EmptyState, Skeleton, statusTone } from "./kit";
import { DateStrip, SlotGrid, doctorPhoto } from "./doctor-bits";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { useT } from "@/i18n";
import { ApiError, api, errorText } from "@/lib/api";
import { openReport, useBookableDates, useSlots } from "@/lib/data";
import { appointmentActionSchema } from "@/lib/validation";
import { dateLK, fmtDate, fmtDateTime, specName } from "@/lib/utils";

export function useAppointmentAction() {
  const qc = useQueryClient();
  return async (id, body) => {
    const action = appointmentActionSchema.safeParse(body);
    if (!z.string().uuid().safeParse(id).success || !action.success) throw new ApiError("invalid_input", 400);
    await api(`/api/appointments/${id}`, { method: "PATCH", body: action.data });
    qc.invalidateQueries();
  };
}

export function AppointmentCard({ a, actions }) {
  const { t, lang } = useT();
  const d = a.doctor;
  return (
    <Card as="article" className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={d ? doctorPhoto(d) : ""} alt="" width={56} height={56} className="size-14 shrink-0 rounded-xl bg-accent object-cover" />
      <div className="min-w-0 flex-1">
        <p className="font-bold">{d?.name}</p>
        <p className="text-sm text-muted-foreground">
          {specName(d?.specialty, lang)} · {d?.hospital?.name}
        </p>
        <p className="mt-1 text-sm font-semibold">{fmtDateTime(a.slot_start, lang)}</p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          <span>{t("dash.ref")} <strong className="font-mono">{a.reference}</strong></span>
          <Badge tone={statusTone(a.status)}>{t(`dash.status_${a.status}`)}</Badge>
        </p>
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </Card>
  );
}

export function CancelDialog({ appt, open, onOpenChange }) {
  const { t, lang } = useT();
  const act = useAppointmentAction();
  const [busy, setBusy] = useState(false);
  if (!appt) return null;
  const confirm = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await act(appt.id, { action: "cancel" });
      toast.success(t("dash.cancelled"));
      onOpenChange(false);
    } catch (err) {
      toast.error(errorText(t, err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("dash.cancelTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("dash.cancelText", { doctor: appt.doctor?.name ?? appt.patient_name, when: fmtDateTime(appt.slot_start, lang) })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t("dash.keep")}</AlertDialogCancel>
          <AlertDialogAction onClick={confirm} disabled={busy} aria-busy={busy}>{t("dash.yesCancel")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RescheduleDialog({ appt, open, onOpenChange }) {
  const { t } = useT();
  const act = useAppointmentAction();
  const doctorId = appt?.doctor?.id;
  const { dates, isLoading } = useBookableDates(doctorId);
  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState(null);
  const [busy, setBusy] = useState(false);
  const day = date && dates.includes(date) ? date : appt && dates.includes(dateLK(appt.slot_start)) ? dateLK(appt.slot_start) : dates[0];
  const slots = useSlots(open ? doctorId : null, day);
  if (!appt) return null;

  const save = async () => {
    setBusy(true);
    try {
      await act(appt.id, { action: "reschedule", slotStart: slot });
      toast.success(t("dash.rescheduled"));
      onOpenChange(false);
      setSlot(null);
    } catch (err) {
      toast.error(errorText(t, err));
      if (err.code === "slot_unavailable") {
        setSlot(null);
        slots.refetch();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t("common.close")} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("dash.rescheduleTitle")}</DialogTitle>
          <DialogDescription>{t("dash.rescheduleText", { doctor: appt.doctor?.name })}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-40" />
        ) : (
          <div className="space-y-4">
            <DateStrip
              dates={dates}
              value={day}
              label={t("profile.dates")}
              onChange={(v) => {
                setDate(v);
                setSlot(null);
              }}
            />
            <SlotGrid slots={slots.data?.map((s) => (s.slot_start === appt.slot_start ? { ...s, status: "booked" } : s))} loading={slots.isLoading} value={slot} onChange={setSlot} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button disabled={!slot} loading={busy} onClick={save}>{t("dash.reschedule")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReportsTable({ reports, loading }) {
  const { t, lang } = useT();
  const [opening, setOpening] = useState(null);
  if (loading) return <Skeleton className="h-40" />;
  if (!reports?.length)
    return (
      <EmptyState icon={<FlaskConical className="size-10" />} title={t("dash.reportsEmpty")}>
        <p className="text-sm text-muted-foreground">{t("dash.reportsEmptyText")}</p>
      </EmptyState>
    );
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
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left">
        <thead className="bg-muted text-sm">
          <tr>
            <th scope="col" className="p-3">{t("dash.test")}</th>
            <th scope="col" className="p-3">{t("dash.invoice")}</th>
            <th scope="col" className="p-3">{t("dash.uploaded")}</th>
            <th scope="col" className="p-3"><span className="sr-only">{t("common.actions")}</span></th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="p-3 font-semibold"><span className="inline-flex items-center gap-2"><FileText className="size-4 text-primary" aria-hidden />{r.test_name}</span></td>
              <td className="p-3 font-mono text-sm">{r.invoice_number}</td>
              <td className="p-3">{fmtDate(r.created_at, lang)}</td>
              <td className="p-3 text-right">
                <Button size="sm" variant="outline" loading={opening === r.id} onClick={() => download(r)} aria-label={`${t("common.download")} ${r.test_name}`}>
                  <Download className="size-4" aria-hidden />
                  {t("common.download")}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
