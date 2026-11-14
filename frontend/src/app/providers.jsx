"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import i18n, { LANG_KEY, LANGS } from "@/i18n";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

function LanguageSync() {
  useEffect(() => {
    let saved = null;
    try {
      saved = localStorage.getItem(LANG_KEY);
    } catch {}
    if (saved && LANGS.some((l) => l.code === saved) && saved !== i18n.language) i18n.changeLanguage(saved);
    document.documentElement.lang = i18n.language;
    const onChange = (lng) => (document.documentElement.lang = lng);
    i18n.on("languageChanged", onChange);
    return () => i18n.off("languageChanged", onChange);
  }, []);
  return null;
}

export default function Providers({ children }) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i18n}>
        <LanguageSync />
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}
