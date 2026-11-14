import { otpRequestSchema, apiError } from "@/lib/validation";
import { clientIp, issueOtp } from "@/lib/server/otp";
import { deliverCode } from "@/lib/server/notify";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const parsed = otpRequestSchema.safeParse(body);
  if (!parsed.success) return apiError("invalid_input");
  const { contact } = parsed.data;

  try {
    const issued = await issueOtp({ identifier: `login:${contact.type}:${contact.value}`, purpose: "login", ip: clientIp(request) });
    if (!issued.ok) return apiError(issued.error, 429);
    const { devCode } = await deliverCode(contact, issued.code, "login");
    return Response.json({ ok: true, ...(devCode ? { devCode } : {}) });
  } catch (e) {
    console.error("[otp/request]", e);
    return apiError("server", 500);
  }
}
