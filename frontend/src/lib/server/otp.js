import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/integrations/supabase/admin";

export const OTP_TTL_SECONDS = 300;
const RESEND_COOLDOWN_SECONDS = 30;
const MAX_PER_IDENTIFIER = 5; // per 15 minutes
const MAX_PER_IP = 20; // per hour
const MAX_ATTEMPTS = 5;

function secret() {
  const s = process.env.OTP_SECRET;
  if (!s || s.length < 32) throw new Error("OTP_SECRET must be set to a random string of at least 32 characters");
  return s;
}

const hash = (identifier, code) => createHmac("sha256", secret()).update(`${identifier}:${code}`).digest("hex");

export function clientIp(request) {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : request.headers.get("x-real-ip"))?.trim() || "unknown";
}

/**
 * Issue a new code after enforcing rate limits.
 * `deliver: false` records the attempt (so limits still apply) without a usable code —
 * used when an invoice/contact pair doesn't match, to avoid revealing which pairs exist.
 */
export async function issueOtp({ identifier, purpose, ip, deliver = true }) {
  const db = getSupabaseAdmin();
  const now = Date.now();
  const since15m = new Date(now - 15 * 60_000).toISOString();
  const since1h = new Date(now - 60 * 60_000).toISOString();

  const [byId, byIp] = await Promise.all([
    db.from("otp_codes").select("created_at").eq("identifier", identifier).eq("purpose", purpose).gte("created_at", since15m).order("created_at", { ascending: false }),
    db.from("otp_codes").select("id", { count: "exact", head: true }).eq("ip", ip).gte("created_at", since1h),
  ]);
  if (byId.error || byIp.error) throw byId.error || byIp.error;

  const recent = byId.data ?? [];
  if (recent.length >= MAX_PER_IDENTIFIER || (byIp.count ?? 0) >= MAX_PER_IP) return { ok: false, error: "rate_limited" };
  if (recent[0] && now - new Date(recent[0].created_at).getTime() < RESEND_COOLDOWN_SECONDS * 1000) return { ok: false, error: "rate_limited" };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  // Invalidate earlier unused codes for this identifier so only the newest works.
  await db.from("otp_codes").update({ used: true }).eq("identifier", identifier).eq("purpose", purpose).eq("used", false);
  const { error } = await db.from("otp_codes").insert({
    identifier,
    purpose,
    code_hash: deliver ? hash(identifier, code) : hash(identifier, `x${code}`),
    expires_at: new Date(now + OTP_TTL_SECONDS * 1000).toISOString(),
    used: !deliver,
    ip,
  });
  if (error) throw error;
  return { ok: true, code: deliver ? code : null };
}

/** Check a code. Every wrong guess counts toward MAX_ATTEMPTS; success consumes the code. */
export async function verifyOtp({ identifier, purpose, code }) {
  const db = getSupabaseAdmin();
  const { data: row, error } = await db
    .from("otp_codes")
    .select("id, code_hash, expires_at, attempts, used")
    .eq("identifier", identifier)
    .eq("purpose", purpose)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!row || row.used) return { ok: false, error: "invalid_code" };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "too_many_attempts" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, error: "expired" };

  const a = Buffer.from(row.code_hash, "hex");
  const b = Buffer.from(hash(identifier, code), "hex");
  const match = a.length === b.length && timingSafeEqual(a, b);
  if (!match) {
    const attempts = row.attempts + 1;
    await db.from("otp_codes").update({ attempts, used: attempts >= MAX_ATTEMPTS }).eq("id", row.id);
    return { ok: false, error: attempts >= MAX_ATTEMPTS ? "too_many_attempts" : "invalid_code" };
  }
  // Conditional update so two concurrent verifications can't both succeed.
  const { data: consumed } = await db.from("otp_codes").update({ used: true }).eq("id", row.id).eq("used", false).select("id");
  if (!consumed?.length) return { ok: false, error: "invalid_code" };
  return { ok: true };
}
