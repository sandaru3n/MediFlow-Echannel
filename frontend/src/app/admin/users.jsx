"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus, Users } from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Select, Skeleton } from "@/components/kit";
import { useAuth } from "@/lib/auth";
import { api, errorText } from "@/lib/api";
import { staffAccountSchema } from "@/lib/validation";
import { getSupabase } from "@/integrations/supabase/client";
import { useT } from "@/i18n";
import { fmtDate } from "@/lib/utils";
import { SearchBox } from "./directory";

const STAFF_ROLES = ["doctor", "admin"];
const roleTone = { patient: "muted", doctor: "teal", admin: "blue" };

export function UsersAdmin() {
  const { t, lang } = useT();
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(null);
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const sb = getSupabase();
      const [p, r] = await Promise.all([
        sb.from("profiles").select("id, full_name, phone, email, created_at").order("created_at", { ascending: false }).limit(500),
        sb.from("user_roles").select("user_id, role"),
      ]);
      if (p.error) throw p.error;
      if (r.error) throw r.error;
      const byUser = {};
      r.data.forEach((x) => (byUser[x.user_id] ??= []).push(x.role));
      return p.data.map((u) => ({ ...u, roles: byUser[u.id] ?? [] }));
    },
  });

  const toggle = async (u, role) => {
    const has = u.roles.includes(role);
    setBusy(`${u.id}:${role}`);
    const sb = getSupabase().from("user_roles");
    const { error } = has ? await sb.delete().eq("user_id", u.id).eq("role", role) : await sb.insert({ user_id: u.id, role });
    setBusy(null);
    if (error) return toast.error(t("common.errorGeneric"));
    toast.success(t("admin.roleUpdated"));
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["doctor-role-users"] });
  };

  const needle = q.trim().toLowerCase();
  const rows = (users.data ?? []).filter((u) => !needle || [u.full_name, u.phone, u.email].some((x) => x?.toLowerCase().includes(needle)));

  return (
    <>
      <PageHeader title={t("admin.users")} />
      <CreateStaff />
      <SearchBox value={q} onChange={setQ} label={t("admin.searchUsers")} />
      {users.isLoading ? (
        <Skeleton className="h-48" />
      ) : users.isError ? (
        <ErrorState message={t("common.errorGeneric")} onRetry={users.refetch} retryLabel={t("common.tryAgain")} />
      ) : !rows.length ? (
        <EmptyState icon={<Users className="size-10" />} title={t("admin.empty")} />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted">
              <tr>
                <th scope="col" className="p-3">{t("common.name")}</th>
                <th scope="col" className="p-3">{t("common.phone")} / {t("common.email")}</th>
                <th scope="col" className="p-3">{t("admin.roles")}</th>
                <th scope="col" className="p-3">{t("common.date")}</th>
                <th scope="col" className="p-3"><span className="sr-only">{t("common.actions")}</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-3 font-semibold">{u.full_name || "—"}</td>
                  <td className="p-3">{u.phone || u.email || "—"}</td>
                  <td className="p-3">
                    <span className="flex flex-wrap gap-1">
                      {u.roles.map((r) => <Badge key={r} tone={roleTone[r]}>{t(`admin.role_${r}`)}</Badge>)}
                    </span>
                  </td>
                  <td className="p-3">{fmtDate(u.created_at, lang)}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      {STAFF_ROLES.map((role) => {
                        const has = u.roles.includes(role);
                        const self = u.id === me?.id && role === "admin";
                        const label = t(has ? "admin.revoke" : "admin.grant", { role: t(`admin.role_${role}`) });
                        return (
                          <Button
                            key={role}
                            size="sm"
                            variant={has ? "outline" : "ghost"}
                            disabled={self}
                            title={self ? t("admin.selfRole") : undefined}
                            loading={busy === `${u.id}:${role}`}
                            onClick={() => toggle(u, role)}
                          >
                            {label}
                          </Button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}

function CreateStaff() {
  const { t } = useT();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(staffAccountSchema), defaultValues: { fullName: "", email: "", password: "", role: "doctor" } });
  const e = (k) => errors[k] && t(errors[k].message);

  const submit = async (v) => {
    try {
      await api("/api/admin/staff", { body: v });
      toast.success(t("admin.created"));
      reset();
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["doctor-role-users"] });
    } catch (err) {
      toast.error(errorText(t, err));
    }
  };

  if (!open)
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="self-start">
        <UserPlus className="size-4" aria-hidden />
        {t("admin.createStaff")}
      </Button>
    );
  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold">{t("admin.createStaff")}</h2>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("admin.createStaffHint")}</p>
      <form noValidate onSubmit={handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2">
        <Field id="st-name" label={t("dash.fullName")} error={e("fullName")}>
          <Input id="st-name" autoComplete="off" invalid={!!errors.fullName} {...register("fullName")} />
        </Field>
        <Field id="st-email" label={t("common.email")} error={e("email")}>
          <Input id="st-email" type="email" autoComplete="off" invalid={!!errors.email} {...register("email")} />
        </Field>
        <Field id="st-pass" label={t("admin.password")} error={e("password")}>
          <Input id="st-pass" type="password" autoComplete="new-password" invalid={!!errors.password} {...register("password")} />
        </Field>
        <Field id="st-role" label={t("admin.role")}>
          <Select id="st-role" {...register("role")}>
            {STAFF_ROLES.map((r) => <option key={r} value={r}>{t(`admin.role_${r}`)}</option>)}
          </Select>
        </Field>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" loading={isSubmitting}>{t("admin.createStaff")}</Button>
          <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
        </div>
      </form>
    </Card>
  );
}
