import { Suspense } from "react";
import LoginClient from "./login-client";

export const metadata = {
  title: "Sign in",
  description: "Password-free sign in with a one-time code, staff sign in, and quick lab report download with your invoice number.",
  openGraph: { title: "Sign in — MediFlow", description: "Password-free sign in and quick lab report download." },
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  );
}
