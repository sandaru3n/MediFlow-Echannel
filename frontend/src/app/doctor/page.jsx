import DoctorClient from "./doctor-client";

export const metadata = {
  title: "Doctor Dashboard",
  description: "Today's and upcoming appointments, weekly availability and lab report uploads.",
  openGraph: { title: "Doctor Dashboard — MediFlow", description: "Clinical workspace for doctors." },
  robots: { index: false },
};

export default function DoctorPage() {
  return <DoctorClient />;
}
