"use client";

import { isDemoMode } from "@/integrations/supabase/client";
import { demoApi } from "@/lib/demo/api";

export class ApiError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

/** JSON fetch to our own route handlers; throws ApiError(code) on failure. */
export async function api(path, { method = "POST", body } = {}) {
  if (isDemoMode()) {
    try {
      return await demoApi(path, method, body);
    } catch (e) {
      throw new ApiError(e?.code || "server", e?.status || 500);
    }
  }
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("server", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || "server", res.status);
  return data;
}

/** Translate an ApiError / Supabase error into a user-facing message. */
export function errorText(t, e) {
  const code = e?.code && typeof e.code === "string" && !/^\d|^PGRST/.test(e.code) ? e.code : null;
  return code ? t(`errors.${code}`, { defaultValue: t("common.errorGeneric") }) : t("common.errorGeneric");
}
