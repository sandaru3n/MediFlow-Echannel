import "server-only";
import { getSupabaseAdmin } from "@/integrations/supabase/admin";

const PHONE_DOMAIN = process.env.PHONE_USER_EMAIL_DOMAIN || "phone.mediflow.example.com";

/** Phone-only users get an internal, never-mailed address so Supabase can issue sessions for them. */
const authEmailFor = (contact) => (contact.type === "email" ? contact.value : `${contact.value.replace(/\D/g, "")}@${PHONE_DOMAIN}`);

/**
 * Find or create the auth user for a verified contact and return a one-time token hash that the
 * browser exchanges for a session via supabase.auth.verifyOtp({ token_hash, type: "email" }).
 */
export async function sessionTokenFor(contact, language = "en") {
  const db = getSupabaseAdmin();
  const email = authEmailFor(contact);

  const { error: createErr } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { language },
    app_metadata: {
      contact_verified: true,
      ...(contact.type === "phone" ? { phone: contact.value, phone_login: true } : {}),
    },
  });
  if (createErr && createErr.code !== "email_exists" && createErr.status !== 422) throw createErr;

  const { data, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  return data.properties.hashed_token;
}
