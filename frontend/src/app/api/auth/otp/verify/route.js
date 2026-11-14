import { z } from "zod";
import { otpVerifySchema, apiError } from "@/lib/validation";
import { verifyOtp } from "@/lib/server/otp";
import { sessionTokenFor } from "@/lib/server/users";

const schema = otpVerifySchema.extend({ language: z.enum(["en", "si", "ta"]).optional() });

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError("invalid_input");
  const { contact, code, language } = parsed.data;

  try {
    const result = await verifyOtp({ identifier: `login:${contact.type}:${contact.value}`, purpose: "login", code });
    if (!result.ok) return apiError(result.error, 400);
    const tokenHash = await sessionTokenFor(contact, language);
    return Response.json({ ok: true, tokenHash });
  } catch (e) {
    console.error("[otp/verify]", e);
    return apiError("server", 500);
  }
}
