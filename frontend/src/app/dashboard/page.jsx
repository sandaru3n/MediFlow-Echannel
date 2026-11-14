import DashboardClient from "./dashboard-client";

export const metadata = {
  title: "My Dashboard",
  description: "Your upcoming and past appointments and lab reports.",
  robots: { index: false },
};

export default function DashboardPage() {
  return <DashboardClient />;
}
