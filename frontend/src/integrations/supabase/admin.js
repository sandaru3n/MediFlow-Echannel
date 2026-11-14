import "server-only";
import { createClient } from "@supabase/supabase-js";

let admin;

/**
 * Service-role client: bypasses RLS. Only for trusted server code (OTP, lab report delivery,
 * staff account creation). Never import from client components.
 */
export function getSupabaseAdmin() {
  if (admin) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}
