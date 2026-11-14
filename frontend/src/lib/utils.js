import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const TZ = "Asia/Colombo";

export const lkr = (n) => `LKR ${Number(n ?? 0).toLocaleString("en-LK")}`;

const localeOf = (lang) => ({ si: "si-LK", ta: "ta-LK" })[lang] ?? "en-GB";

/** "2026-11-14" -> "Sat, 14 Nov" in the chosen language (date-only strings are treated as Sri Lanka dates). */
export const fmtDate = (d, lang = "en") =>
  new Date(typeof d === "string" && d.length === 10 ? d + "T00:00:00+05:30" : d).toLocaleDateString(localeOf(lang), {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: TZ,
  });

/** "2026-11-14" -> { weekday: "Sat", day: "14", month: "Nov" } in the chosen language. */
export const dateParts = (ymd, lang = "en") => {
  const d = new Date(ymd + "T00:00:00+05:30");
  const part = (opts) => d.toLocaleDateString(localeOf(lang), { ...opts, timeZone: TZ });
  return { weekday: part({ weekday: "short" }), day: part({ day: "numeric" }), month: part({ month: "short" }) };
};

/** Hour of day (0–23) of an ISO timestamp in Sri Lanka time. */
export const hourLK = (iso) => Number(new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", hour12: false, timeZone: TZ }).slice(0, 2));

export const fmtTime = (iso, lang = "en") =>
  new Date(iso).toLocaleTimeString(localeOf(lang), { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });

export const fmtDateTime = (iso, lang = "en") => `${fmtDate(iso, lang)} · ${fmtTime(iso, lang)}`;

/** Today's date in Sri Lanka as YYYY-MM-DD. */
export const todayLK = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });

/** Local Sri Lanka calendar date (YYYY-MM-DD) of an ISO timestamp. */
export const dateLK = (iso) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });

export const addDays = (ymd, n) => {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Pick the localized specialty name (name_en / name_si / name_ta). */
export const specName = (s, lang = "en") => (s ? s[`name_${lang}`] || s.name_en : "");

export const avatarFor = (seed) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=dbeafe,ccfbf1`;

/** Mask a phone (+94 77 *** 67) or email (j•••@mail.com) for display. */
export const maskContact = (type, value) => {
  if (type === "phone") {
    const v = value.replace(/\D/g, "").replace(/^94/, "");
    return `+94 ${v.slice(0, 2)} *** ${v.slice(-2)}`;
  }
  return value.replace(/(.).+(@.+)/, "$1•••$2");
};
