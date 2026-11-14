import { contactFormSchema, apiError } from "@/lib/validation";
import { getSupabaseAdmin } from "@/integrations/supabase/admin";
import { clientIp } from "@/lib/server/otp";

const MAX_PER_IP_PER_HOUR = 5;

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const parsed = contactFormSchema.safeParse(body);
  if (!parsed.success) return apiError("invalid_input");
  const { website, ...msg } = parsed.data;
  if (website) return Response.json({ ok: true }); // honeypot: silently drop bots

  try {
    const db = getSupabaseAdmin();
    const ip = clientIp(request);
    const { count } = await db
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", new Date(Date.now() - 3600_000).toISOString());
    if ((count ?? 0) >= MAX_PER_IP_PER_HOUR) return apiError("rate_limited", 429);
    const { error } = await db.from("contact_messages").insert({ ...msg, ip });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[contact]", e);
    return apiError("server", 500);
  }
}
