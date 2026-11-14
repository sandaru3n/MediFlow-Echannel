import "server-only";
import { getSupabaseAdmin } from "@/integrations/supabase/admin";

export const LAB_BUCKET = "lab-reports";
export const LAB_LINK_SECONDS = 300;

export const labIdentifier = (invoice, contact) => `lab:${invoice}:${contact.type}:${contact.value}`;

export async function findLabReport(invoice) {
  const { data, error } = await getSupabaseAdmin()
    .from("lab_reports")
    .select("id, invoice_number, test_name, patient_phone, patient_email, file_path, created_at")
    .eq("invoice_number", invoice)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export const contactMatches = (report, contact) =>
  contact.type === "phone" ? report.patient_phone === contact.value : (report.patient_email ?? "").toLowerCase() === contact.value;

export async function signedUrlFor(report) {
  const { data, error } = await getSupabaseAdmin()
    .storage.from(LAB_BUCKET)
    .createSignedUrl(report.file_path, LAB_LINK_SECONDS, { download: `${report.invoice_number}.pdf` });
  if (error) throw error;
  return data.signedUrl;
}
