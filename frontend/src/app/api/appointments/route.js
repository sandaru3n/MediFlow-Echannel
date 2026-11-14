import { bookingSchema, apiError } from "@/lib/validation";
import { createSupabaseServer } from "@/integrations/supabase/server";
import { rpcErrorCode } from "@/lib/server/rpc";

/** Book a slot for the signed-in patient. The RPC re-checks availability atomically. */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) return apiError("invalid_input");
  const v = parsed.data;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("not_authenticated", 401);

  const { data, error } = await supabase.rpc("book_appointment", {
    p_doctor: v.doctorId,
    p_slot_start: v.slotStart,
    p_name: v.fullName,
    p_phone: v.phone,
    p_email: v.email,
    p_notes: v.notes,
  });
  if (error) {
    const code = rpcErrorCode(error);
    return apiError(code, code === "server" ? 500 : 409);
  }
  const row = Array.isArray(data) ? data[0] : data;
  return Response.json({ ok: true, id: row.id, reference: row.reference });
}
