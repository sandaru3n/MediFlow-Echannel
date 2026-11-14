import AdminClient from "./admin-client";

export const metadata = {
  title: "Admin Dashboard",
  description: "Manage doctors, hospitals, specialties, users, appointments and lab reports.",
  openGraph: { title: "Admin Dashboard — MediFlow", description: "Platform administration." },
  robots: { index: false },
};

export default function AdminPage() {
  return <AdminClient />;
}
