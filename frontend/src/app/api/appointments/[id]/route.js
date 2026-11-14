import { z } from "zod";
import { appointmentActionSchema, apiError } from "@/lib/validation";
import { createSupabaseServer } from "@/integrations/supabase/server";
import { rpcErrorCode } from "@/lib/server/rpc";

/** Cancel, reschedule or complete an appointment. Permission checks live in the RPCs. */
export async function PATCH(request, { params }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return apiError("invalid_input");
  const body = await request.json().catch(() => null);
  const parsed = appointmentActionSchema.safeParse(body);
  if (!parsed.success) return apiError("invalid_input");
  const action = parsed.data;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("not_authenticated", 401);

  const { error } =
    action.action === "cancel"
      ? await supabase.rpc("cancel_appointment", { p_id: id })
      : action.action === "complete"
        ? await supabase.rpc("complete_appointment", { p_id: id })
        : await supabase.rpc("reschedule_appointment", { p_id: id, p_new_start: action.slotStart });

  if (error) {
    const code = rpcErrorCode(error);
    return apiError(code, code === "forbidden" ? 403 : code === "server" ? 500 : 409);
  }
  return Response.json({ ok: true });
}
