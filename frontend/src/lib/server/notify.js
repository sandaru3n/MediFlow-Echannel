import "server-only";

const isDevMode = () => process.env.NODE_ENV !== "production" || process.env.OTP_DEV_MODE === "true";

const MESSAGES = {
  login: (c) => `Your MediFlow sign-in code is ${c}. It expires in 5 minutes. Never share this code.`,
  lab: (c) => `Your MediFlow lab report code is ${c}. It expires in 5 minutes. Never share this code.`,
};

/** Notify.lk (Sri Lankan SMS gateway). Phone is +947XXXXXXXX; Notify.lk expects 947XXXXXXXX. */
async function sendSms(phone, text) {
  const { NOTIFY_LK_USER_ID, NOTIFY_LK_API_KEY, NOTIFY_LK_SENDER_ID } = process.env;
  if (!NOTIFY_LK_USER_ID || !NOTIFY_LK_API_KEY || !NOTIFY_LK_SENDER_ID) return false;
  const params = new URLSearchParams({
    user_id: NOTIFY_LK_USER_ID,
    api_key: NOTIFY_LK_API_KEY,
    sender_id: NOTIFY_LK_SENDER_ID,
    to: phone.replace(/^\+/, ""),
    message: text,
  });
  const res = await fetch("https://app.notify.lk/api/v1/send", { method: "POST", body: params });
  if (!res.ok) throw new Error(`SMS gateway error ${res.status}`);
  return true;
}

/** Resend (transactional email). */
async function sendEmail(to, text) {
  const { RESEND_API_KEY, EMAIL_FROM } = process.env;
  if (!RESEND_API_KEY || !EMAIL_FROM) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject: "Your MediFlow code", text }),
  });
  if (!res.ok) throw new Error(`Email provider error ${res.status}`);
  return true;
}

/**
 * Deliver a one-time code. Returns { devCode } only in development when no provider is configured,
 * so the flow can be tested locally. In production a missing provider is an error.
 */
export async function deliverCode(contact, code, purpose) {
  const text = MESSAGES[purpose](code);
  const sent = contact.type === "phone" ? await sendSms(contact.value, text) : await sendEmail(contact.value, text);
  if (sent) return {};
  if (isDevMode()) {
    console.info(`[otp:dev] ${purpose} code for ${contact.value}: ${code}`);
    return { devCode: code };
  }
  throw new Error(`No ${contact.type === "phone" ? "SMS" : "email"} provider configured`);
}
