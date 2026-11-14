"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getDemoClient } from "@/lib/demo/client";

let client;

export const isSupabaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** Without Supabase keys the app runs on hardcoded demo data stored in this browser. */
export const isDemoMode = () => !isSupabaseConfigured();

/** Browser Supabase client (anon key + user session; every query is subject to RLS), or the demo stand-in. */
export function getSupabase() {
  if (isDemoMode()) return getDemoClient();
  if (!client) client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return client;
}
