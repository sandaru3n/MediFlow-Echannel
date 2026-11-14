import ContactClient from "./contact-client";

export const metadata = {
  title: "Contact Us",
  description: "Call, email or message our support team about bookings and lab reports.",
  openGraph: { title: "Contact MediFlow", description: "Get help with bookings and lab reports." },
};

export default function ContactPage() {
  return <ContactClient />;
}
