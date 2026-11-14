import { Suspense } from "react";
import RegisterClient from "./register-client";

export const metadata = {
  title: "Create an account",
  description: "Create a free patient account to book doctors, manage appointments and get lab reports securely. No password needed.",
  openGraph: { title: "Create an account — MediFlow", description: "Password-free patient sign up." },
  robots: { index: false },
};

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterClient />
    </Suspense>
  );
}
