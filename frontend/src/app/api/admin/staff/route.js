import { staffAccountSchema, apiError } from "@/lib/validation";
import { createSupabaseServer } from "@/integrations/supabase/server";
import { getSupabaseAdmin } from "@/integrations/supabase/admin";

/** Admin-only: create a confirmed doctor/admin account with a password. */
export async function POST(request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("not_authenticated", 401);
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) return apiError("forbidden", 403);

  const body = await request.json().catch(() => null);
  const parsed = staffAccountSchema.safeParse(body);
  if (!parsed.success) return apiError("invalid_input");
  const v = parsed.data;

  const db = getSupabaseAdmin();
  const { data, error } = await db.auth.admin.createUser({
    email: v.email,
    password: v.password,
    email_confirm: true,
    user_metadata: { full_name: v.fullName },
    app_metadata: { contact_verified: true },
  });
  if (error) return apiError(error.code === "email_exists" ? "email_exists" : "invalid_input", 409);

  const { error: roleErr } = await db.from("user_roles").insert({ user_id: data.user.id, role: v.role });
  if (roleErr) {
    console.error("[admin/staff]", roleErr);
    return apiError("server", 500);
  }
  await db.from("profiles").update({ full_name: v.fullName }).eq("id", data.user.id);
  return Response.json({ ok: true, id: data.user.id });
}
