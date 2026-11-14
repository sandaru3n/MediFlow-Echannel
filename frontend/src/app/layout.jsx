import { Figtree, Plus_Jakarta_Sans, Noto_Sans_Sinhala, Noto_Sans_Tamil } from "next/font/google";
import Providers from "./providers";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-jakarta", display: "swap" });
const sinhala = Noto_Sans_Sinhala({ subsets: ["sinhala"], weight: ["400", "600", "700"], variable: "--font-noto-sinhala", display: "swap" });
const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], weight: ["400", "600", "700"], variable: "--font-noto-tamil", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MediFlow — Book doctors & get lab reports in Sri Lanka",
    template: "%s | MediFlow",
  },
  description: "Search doctors by specialty, hospital or location, book real available slots and download lab reports securely across Sri Lanka.",
  applicationName: "MediFlow",
  openGraph: {
    type: "website",
    siteName: "MediFlow",
    title: "MediFlow — Book trusted doctors across Sri Lanka",
    description: "Find a specialist, choose a real available slot and get your lab reports securely.",
    locale: "en_LK",
    alternateLocale: ["si_LK", "ta_LK"],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${figtree.variable} ${jakarta.variable} ${sinhala.variable} ${tamil.variable}`} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
