import { labVerifySchema, apiError } from "@/lib/validation";
import { verifyOtp } from "@/lib/server/otp";
import { findLabReport, contactMatches, labIdentifier, signedUrlFor, LAB_LINK_SECONDS } from "@/lib/server/lab";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const parsed = labVerifySchema.safeParse(body);
  if (!parsed.success) return apiError("invalid_input");
  const { invoice, contact, code } = parsed.data;

  try {
    const result = await verifyOtp({ identifier: labIdentifier(invoice, contact), purpose: "lab", code });
    if (!result.ok) return apiError(result.error, 400);

    const report = await findLabReport(invoice);
    if (!report || !contactMatches(report, contact)) return apiError("invalid_code", 400);

    const url = await signedUrlFor(report);
    return Response.json({
      ok: true,
      expiresIn: LAB_LINK_SECONDS,
      reports: [{ id: report.id, invoice: report.invoice_number, testName: report.test_name, createdAt: report.created_at, url }],
    });
  } catch (e) {
    console.error("[lab/verify]", e);
    return apiError("server", 500);
  }
}
