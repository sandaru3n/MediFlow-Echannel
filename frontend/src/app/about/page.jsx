import AboutClient from "./about-client";

export const metadata = {
  title: "About Us",
  description: "Our purpose: making doctor appointments and lab reports simple and secure for every patient in Sri Lanka.",
  openGraph: { title: "About MediFlow", description: "Who we are and what we do for patients." },
};

export default function AboutPage() {
  return <AboutClient />;
}
