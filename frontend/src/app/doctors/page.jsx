import { Suspense } from "react";
import DoctorsClient from "./doctors-client";

export const metadata = {
  title: "Find Doctors",
  description: "Search doctors across Sri Lanka by name, specialty, hospital, district and available date.",
  openGraph: { title: "Find Doctors — MediFlow", description: "Filter by specialty, hospital, district and date, then book a real available slot." },
};

export default function DoctorsPage() {
  return (
    <Suspense>
      <DoctorsClient />
    </Suspense>
  );
}
