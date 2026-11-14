"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Select, Skeleton, Textarea } from "@/components/kit";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScheduleManager } from "@/components/schedule";
import { doctorPhoto } from "@/components/doctor-bits";
import { DOCTOR_FIELDS, keys, useHospitals, useSpecialties } from "@/lib/data";
import { doctorSchema, hospitalSchema, specialtySchema } from "@/lib/validation";
import { getSupabase } from "@/integrations/supabase/client";
import { useT } from "@/i18n";
import { lkr, specName } from "@/lib/utils";

const dbErrorText = (t, error) => (error.code === "23503" ? t("admin.inUse") : t("common.errorGeneric"));

/** Shared table chrome with loading / error / empty states. */
function DataTable({ q, columns, rows, empty, actions }) {
  const { t } = useT();
  if (q.isLoading) return <Skeleton className="h-48" />;
  if (q.isError) return <ErrorState message={t("common.errorGeneric")} onRetry={q.refetch} retryLabel={t("common.tryAgain")} />;
  if (!rows.length) return <EmptyState icon={<Search className="size-10" />} title={empty ?? t("admin.empty")} />;
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-muted">
          <tr>
            {columns.map((c) => <th key={c.key} scope="col" className="p-3">{c.label}</th>)}
            <th scope="col" className="p-3"><span className="sr-only">{t("common.actions")}</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border align-middle">
              {columns.map((c) => <td key={c.key} className="p-3">{c.render ? c.render(r) : r[c.key]}</td>)}
              <td className="p-3"><div className="flex justify-end gap-1">{actions(r)}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function RowActions({ label, onEdit, onDelete, extra }) {
  const { t } = useT();
  return (
    <>
      {extra}
      <Button size="sm" variant="ghost" onClick={onEdit} aria-label={`${t("common.edit")} ${label}`}><Pencil className="size-4" aria-hidden /></Button>
      <Button size="sm" variant="ghost" onClick={onDelete} aria-label={`${t("common.delete")} ${label}`}><Trash2 className="size-4 text-destructive" aria-hidden /></Button>
    </>
  );
}

function ConfirmDelete({ target, label, onConfirm, onClose }) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("admin.deleteTitle", { name: label })}</AlertDialogTitle>
          <AlertDialogDescription>{t("admin.deleteText")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={async (e) => {
              e.preventDefault();
              setBusy(true);
              await onConfirm();
              setBusy(false);
            }}
          >
            {t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Insert or update a row, then refresh the given query keys. Returns true on success. */
function useSaveRow(table, invalidateKeys) {
  const { t } = useT();
  const qc = useQueryClient();
  const refresh = () => invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
  const save = async (id, values) => {
    const sb = getSupabase().from(table);
    const { error } = id ? await sb.update(values).eq("id", id) : await sb.insert(values);
    if (error) {
      toast.error(error.code === "23505" ? t("errors.invalid_input") : t("common.errorGeneric"));
      return false;
    }
    toast.success(t("common.saved"));
    refresh();
    return true;
  };
  const remove = async (id) => {
    const { error } = await getSupabase().from(table).delete().eq("id", id);
    if (error) return toast.error(dbErrorText(t, error));
    toast.success(t("common.deleted"));
    refresh();
  };
  return { save, remove };
}

// ---------------------------------------------------------------------------
// Doctors
// ---------------------------------------------------------------------------

export function DoctorsAdmin() {
  const { t, lang } = useT();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null); // null = closed, {} = new, row = edit
  const [deleting, setDeleting] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const doctors = useQuery({
    queryKey: ["admin-doctors"],
    queryFn: async () => {
      const { data, error } = await getSupabase().from("doctors").select(DOCTOR_FIELDS).order("name");
      if (error) throw error;
      return data;
    },
  });
  const { save, remove } = useSaveRow("doctors", [["admin-doctors"], keys.doctors, ["doctor"], ["next-slots"]]);
  const needle = q.trim().toLowerCase();
  const rows = (doctors.data ?? []).filter(
    (d) => !needle || [d.name, d.hospital?.name, d.hospital?.district, specName(d.specialty, "en")].some((x) => x?.toLowerCase().includes(needle)),
  );

  return (
    <>
      <PageHeader title={t("admin.doctors")}>
        <Button onClick={() => setEditing({})}><Plus className="size-4" aria-hidden />{t("admin.addDoctor")}</Button>
      </PageHeader>
      <SearchBox value={q} onChange={setQ} label={t("common.search")} />
      <DataTable
        q={doctors}
        rows={rows}
        columns={[
          {
            key: "name",
            label: t("common.name"),
            render: (d) => (
              <span className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={doctorPhoto(d)} alt="" width={36} height={36} className="size-9 rounded-lg bg-accent object-cover" />
                <span className="font-semibold">{d.name}</span>
              </span>
            ),
          },
          { key: "spec", label: t("doctors.specialty"), render: (d) => specName(d.specialty, lang) },
          { key: "hosp", label: t("doctors.hospital"), render: (d) => <>{d.hospital?.name}<span className="block text-xs text-muted-foreground">{d.hospital?.district}</span></> },
          { key: "fee", label: t("doctors.fee"), render: (d) => lkr(d.fee) },
          { key: "active", label: t("common.status"), render: (d) => <Badge tone={d.active ? "success" : "muted"}>{d.active ? t("admin.active") : t("admin.inactive")}</Badge> },
        ]}
        actions={(d) => (
          <RowActions
            label={d.name}
            onEdit={() => setEditing(d)}
            onDelete={() => setDeleting(d)}
            extra={
              <Button size="sm" variant="ghost" onClick={() => setSchedule(d)} aria-label={`${t("admin.manageSchedule")}: ${d.name}`} title={t("admin.manageSchedule")}>
                <CalendarClock className="size-4" aria-hidden />
              </Button>
            }
          />
        )}
      />
      {editing && <DoctorDialog row={editing} onClose={() => setEditing(null)} onSave={save} />}
      <ConfirmDelete target={deleting} label={deleting?.name} onClose={() => setDeleting(null)} onConfirm={async () => { await remove(deleting.id); setDeleting(null); }} />
      <Dialog open={!!schedule} onOpenChange={(o) => !o && setSchedule(null)}>
        <DialogContent closeLabel={t("common.close")} className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.scheduleFor", { name: schedule?.name })}</DialogTitle>
            <DialogDescription>{t("doctorDash.weeklyHint")}</DialogDescription>
          </DialogHeader>
          {schedule && <ScheduleManager doctorId={schedule.id} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function DoctorDialog({ row, onClose, onSave }) {
  const { t, lang } = useT();
  const specialties = useSpecialties();
  const hospitals = useHospitals();
  const doctorUsers = useQuery({
    queryKey: ["doctor-role-users"],
    queryFn: async () => {
      const sb = getSupabase();
      const { data: roles, error } = await sb.from("user_roles").select("user_id").eq("role", "doctor");
      if (error) throw error;
      if (!roles.length) return [];
      const { data, error: e2 } = await sb.from("profiles").select("id, full_name, email, phone").in("id", roles.map((r) => r.user_id));
      if (e2) throw e2;
      return data;
    },
  });
  const isNew = !row.id;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      name: row.name ?? "",
      specialty_id: row.specialty?.id ?? "",
      hospital_id: row.hospital?.id ?? "",
      experience_years: row.experience_years ?? 0,
      fee: row.fee ?? 0,
      bio: row.bio ?? "",
      photo_url: row.photo_url ?? "",
      user_id: row.user_id ?? "",
      active: row.active ?? true,
    },
  });
  const e = (k) => errors[k] && t(errors[k].message);
  const submit = async (v) => {
    if (await onSave(row.id, v)) onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={t("common.close")} className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? t("admin.addDoctor") : t("admin.editDoctor")}</DialogTitle>
        </DialogHeader>
        <form id="doctor-form" noValidate onSubmit={handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field id="d-name" label={t("common.name")} error={e("name")}>
              <Input id="d-name" invalid={!!errors.name} {...register("name")} />
            </Field>
          </div>
          <Field id="d-spec" label={t("doctors.specialty")} error={e("specialty_id")}>
            <Select id="d-spec" invalid={!!errors.specialty_id} {...register("specialty_id")}>
              <option value="">—</option>
              {specialties.data?.map((s) => <option key={s.id} value={s.id}>{specName(s, lang)}</option>)}
            </Select>
          </Field>
          <Field id="d-hosp" label={t("doctors.hospital")} error={e("hospital_id")}>
            <Select id="d-hosp" invalid={!!errors.hospital_id} {...register("hospital_id")}>
              <option value="">—</option>
              {hospitals.data?.map((h) => <option key={h.id} value={h.id}>{h.name} · {h.district}</option>)}
            </Select>
          </Field>
          <Field id="d-exp" label={t("admin.experienceYears")} error={e("experience_years")}>
            <Input id="d-exp" type="number" min={0} max={70} invalid={!!errors.experience_years} {...register("experience_years")} />
          </Field>
          <Field id="d-fee" label={t("admin.feeLkr")} error={e("fee")}>
            <Input id="d-fee" type="number" min={0} step={100} invalid={!!errors.fee} {...register("fee")} />
          </Field>
          <div className="sm:col-span-2">
            <Field id="d-photo" label={t("admin.photoUrl")} optionalLabel={t("common.optional")} error={e("photo_url")}>
              <Input id="d-photo" type="url" placeholder="https://…" invalid={!!errors.photo_url} {...register("photo_url")} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field id="d-bio" label={t("admin.bio")} optionalLabel={t("common.optional")}>
              <Textarea id="d-bio" rows={3} maxLength={2000} {...register("bio")} />
            </Field>
          </div>
          <Field id="d-user" label={t("admin.linkedUser")} error={e("user_id")}>
            <Select id="d-user" {...register("user_id")}>
              <option value="">{t("admin.noLinkedUser")}</option>
              {doctorUsers.data?.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email || u.phone}</option>)}
            </Select>
          </Field>
          <label className="flex items-center gap-2 self-end pb-3 font-semibold">
            <input type="checkbox" className="size-5 accent-primary" {...register("active")} />
            {t("admin.active")}
          </label>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" form="doctor-form" loading={isSubmitting}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Hospitals & specialties (same shape: a list + simple field form)
// ---------------------------------------------------------------------------

function SimpleDirectory({ title, addLabel, editLabel, query, table, schema, fields, columns, labelOf, invalidate }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const { save, remove } = useSaveRow(table, invalidate);
  return (
    <>
      <PageHeader title={title}>
        <Button onClick={() => setEditing({})}><Plus className="size-4" aria-hidden />{addLabel}</Button>
      </PageHeader>
      <DataTable q={query} rows={query.data ?? []} columns={columns} actions={(r) => <RowActions label={labelOf(r)} onEdit={() => setEditing(r)} onDelete={() => setDeleting(r)} />} />
      {editing && (
        <SimpleDialog
          title={editing.id ? editLabel : addLabel}
          row={editing}
          schema={schema}
          fields={fields}
          onClose={() => setEditing(null)}
          onSubmit={async (v) => (await save(editing.id, v)) && setEditing(null)}
        />
      )}
      <ConfirmDelete target={deleting} label={deleting && labelOf(deleting)} onClose={() => setDeleting(null)} onConfirm={async () => { await remove(deleting.id); setDeleting(null); }} />
    </>
  );
}

function SimpleDialog({ title, row, schema, fields, onClose, onSubmit }) {
  const { t } = useT();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: Object.fromEntries(fields.map((f) => [f.name, row[f.name] ?? ""])) });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={t("common.close")}>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form id="simple-form" noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {fields.map((f) => (
            <Field key={f.name} id={`sf-${f.name}`} label={f.label} optionalLabel={f.optional && t("common.optional")} error={errors[f.name] && t(errors[f.name].message)}>
              <Input id={`sf-${f.name}`} lang={f.lang} invalid={!!errors[f.name]} {...register(f.name)} />
            </Field>
          ))}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" form="simple-form" loading={isSubmitting}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HospitalsAdmin() {
  const { t } = useT();
  const hospitals = useHospitals();
  return (
    <SimpleDirectory
      title={t("admin.hospitals")}
      addLabel={t("admin.addHospital")}
      editLabel={t("admin.editHospital")}
      query={hospitals}
      table="hospitals"
      schema={hospitalSchema}
      invalidate={[keys.hospitals, ["admin-doctors"], keys.doctors]}
      labelOf={(h) => h.name}
      fields={[
        { name: "name", label: t("common.name") },
        { name: "district", label: t("admin.district") },
        { name: "address", label: t("admin.address"), optional: true },
      ]}
      columns={[
        { key: "name", label: t("common.name"), render: (h) => <span className="font-semibold">{h.name}</span> },
        { key: "district", label: t("admin.district") },
        { key: "address", label: t("admin.address"), render: (h) => h.address || "—" },
      ]}
    />
  );
}

export function SpecialtiesAdmin() {
  const { t } = useT();
  const specialties = useSpecialties();
  return (
    <SimpleDirectory
      title={t("admin.specialties")}
      addLabel={t("admin.addSpecialty")}
      editLabel={t("admin.editSpecialty")}
      query={specialties}
      table="specialties"
      schema={specialtySchema}
      invalidate={[keys.specialties, ["admin-doctors"], keys.doctors]}
      labelOf={(s) => s.name_en}
      fields={[
        { name: "name_en", label: t("admin.nameEn"), lang: "en" },
        { name: "name_si", label: t("admin.nameSi"), lang: "si" },
        { name: "name_ta", label: t("admin.nameTa"), lang: "ta" },
      ]}
      columns={[
        { key: "name_en", label: t("admin.nameEn"), render: (s) => <span className="font-semibold">{s.name_en}</span> },
        { key: "name_si", label: t("admin.nameSi"), render: (s) => <span lang="si">{s.name_si}</span> },
        { key: "name_ta", label: t("admin.nameTa"), render: (s) => <span lang="ta">{s.name_ta}</span> },
      ]}
    />
  );
}

export function SearchBox({ value, onChange, label }) {
  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input type="search" aria-label={label} placeholder={label} className="h-11 pl-9" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
