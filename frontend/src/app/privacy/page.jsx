import { LegalPage } from "@/components/legal";

export const metadata = {
  title: "Privacy Policy",
  description: "How MediFlow collects, uses and protects your personal and medical information.",
  openGraph: { title: "Privacy Policy — MediFlow", description: "How we protect your data." },
};

export default function PrivacyPage() {
  return <LegalPage titleKey="legal.privacyTitle" introKey="legal.privacyIntro" prefix="p" />;
}
