import { LegalPage } from "@/components/legal";

export const metadata = {
  title: "Terms of Service",
  description: "Terms for booking appointments and accessing lab reports on MediFlow.",
  openGraph: { title: "Terms of Service — MediFlow", description: "Terms for using MediFlow." },
};

export default function TermsPage() {
  return <LegalPage titleKey="legal.termsTitle" introKey="legal.termsIntro" prefix="t" />;
}
