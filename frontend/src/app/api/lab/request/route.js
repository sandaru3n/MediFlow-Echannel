import { labRequestSchema, apiError } from "@/lib/validation";
import { clientIp, issueOtp } from "@/lib/server/otp";
import { deliverCode } from "@/lib/server/notify";
import { findLabReport, contactMatches, labIdentifier } from "@/lib/server/lab";

/** Always answers the same way whether or not the invoice/contact pair exists. */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const parsed = labRequestSchema.safeParse(body);
  if (!parsed.success) return apiError("invalid_input");
  const { invoice, contact } = parsed.data;

  try {
    const report = await findLabReport(invoice);
    const match = !!report && contactMatches(report, contact);
    const issued = await issueOtp({ identifier: labIdentifier(invoice, contact), purpose: "lab", ip: clientIp(request), deliver: match });
    if (!issued.ok) return apiError(issued.error, 429);
    if (!match) return Response.json({ ok: true });
    const { devCode } = await deliverCode(contact, issued.code, "lab");
    return Response.json({ ok: true, ...(devCode ? { devCode } : {}) });
  } catch (e) {
    console.error("[lab/request]", e);
    return apiError("server", 500);
  }
}
