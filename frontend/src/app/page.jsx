import HomeClient from "./home-client";

export const metadata = {
  title: { absolute: "MediFlow — Book trusted doctors across Sri Lanka" },
  description: "Find a specialist, choose a real available slot and get your lab reports securely. Available in English, Sinhala and Tamil.",
  openGraph: {
    title: "Book trusted doctors across Sri Lanka — MediFlow",
    description: "Search doctors by specialty, hospital or district, book real slots and download lab reports securely.",
    images: [{ url: "/og-hero.jpg", alt: "A doctor speaking with an elderly patient" }],
  },
};

export default function HomePage() {
  return <HomeClient />;
}
