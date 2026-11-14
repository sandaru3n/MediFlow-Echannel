import { Suspense } from "react";
import { createSupabasePublic } from "@/integrations/supabase/server";
import { buildSeed } from "@/lib/demo/seed";
import ProfileClient from "./profile-client";

export async function generateMetadata({ params }) {
  const { id } = await params;
  let d = null;
  if (/^[0-9a-f-]{36}$/i.test(id) && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { data } = await createSupabasePublic()
      .from("doctors")
      .select("name, photo_url, specialty:specialties(name_en), hospital:hospitals(name, district)")
      .eq("id", id)
      .eq("active", true)
      .maybeSingle();
    d = data;
  } else if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const seed = buildSeed();
    const doc = seed.doctors.find((x) => x.id === id);
    // Doctors added in the demo admin live only in the browser, so fall back to a neutral title.
    if (!doc) return { title: "Doctor profile" };
    d = { ...doc, specialty: seed.specialties.find((s) => s.id === doc.specialty_id), hospital: seed.hospitals.find((h) => h.id === doc.hospital_id) };
  }
  if (!d) return { title: "Doctor not found", robots: { index: false } };
  const title = `${d.name} — ${d.specialty?.name_en}`;
  const description = `Book ${d.name}, ${d.specialty?.name_en} at ${d.hospital?.name}, ${d.hospital?.district}. View real available slots and book online.`;
  return { title, description, openGraph: { title, description, images: d.photo_url ? [{ url: d.photo_url }] : undefined } };
}

export default async function DoctorProfilePage({ params }) {
  const { id } = await params;
  return (
    <Suspense>
      <ProfileClient id={id} />
    </Suspense>
  );
}
