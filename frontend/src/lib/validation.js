import { z } from "zod";

// Shared by client forms (react-hook-form + zodResolver) and API route handlers.
// Error messages are i18n keys; the UI passes them through t().

/** Normalise any common Sri Lankan mobile format to +947XXXXXXXX, or null. */
export function normalizePhone(v) {
  const digits = String(v ?? "").replace(/[\s()-]/g, "");
  const m = digits.match(/^(?:\+?94|0)?(7\d{8})$/);
  return m ? `+94${m[1]}` : null;
}

export const phoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const p = normalizePhone(v);
    if (!p) {
      ctx.addIssue({ code: "custom", message: "validation.phone" });
      return z.NEVER;
    }
    return p;
  });

export const emailSchema = z.string().trim().toLowerCase().max(254, "validation.email").email("validation.email");

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "validation.email")
  .refine((v) => v === "" || z.string().email().safeParse(v).success, "validation.email")
  .nullish()
  .transform((v) => (v ? v : null));

export const nameSchema = z.string().trim().min(2, "validation.nameMin").max(120, "validation.nameMax");

export const contactSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("phone"), value: phoneSchema }),
  z.object({ type: z.literal("email"), value: emailSchema }),
]);

export const otpCodeSchema = z.string().regex(/^\d{6}$/, "validation.code");

export const invoiceSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{4,20}$/, "validation.invoice");

/** YYYY-MM-DD calendar date. */
export const ymdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validation.date");

/** Free-text doctor search: trimmed, max 100 chars, control characters and angle brackets removed. */
export const searchSchema = z
  .string()
  .max(100, "validation.search")
  .transform((v) => v.replace(/[\u0000-\u001f\u007f<>]/g, "").trim());

const fromUrl = (schema) => schema.optional().catch(undefined);

/** Doctor search filters read from the URL; invalid values are dropped instead of breaking the page. */
export const doctorFiltersSchema = z.object({
  q: fromUrl(searchSchema),
  spec: fromUrl(z.string().uuid()),
  district: fromUrl(z.string().trim().min(1).max(40)),
  hospital: fromUrl(z.string().uuid()),
  date: fromUrl(ymdSchema),
  sort: fromUrl(z.enum(["relevance", "next", "fee"])),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});

export const MAX_REPORT_BYTES = 10 * 1024 * 1024;

/** Lab report upload: a non-empty PDF up to 10 MB. */
export const labFileSchema = z
  .custom((f) => typeof File !== "undefined" && f instanceof File, "validation.file")
  .refine((f) => f.type === "application/pdf" && /\.pdf$/i.test(f.name), "validation.fileType")
  .refine((f) => f.size > 0 && f.size <= MAX_REPORT_BYTES, "validation.fileSize");

export const otpRequestSchema = z.object({ contact: contactSchema });
export const otpVerifySchema = z.object({ contact: contactSchema, code: otpCodeSchema });
export const labRequestSchema = z.object({ invoice: invoiceSchema, contact: contactSchema });
export const labVerifySchema = z.object({ invoice: invoiceSchema, contact: contactSchema, code: otpCodeSchema });

export const bookingSchema = z.object({
  doctorId: z.string().uuid(),
  slotStart: z.string().datetime({ offset: true }),
  fullName: nameSchema,
  phone: phoneSchema,
  email: optionalEmail,
  notes: z
    .string()
    .trim()
    .max(500, "validation.notesMax")
    .nullish()
    .transform((v) => (v ? v : null)),
});

/** Client-side booking form (doctor/slot are added on submit). */
export const bookingFormSchema = bookingSchema.pick({ fullName: true, phone: true, email: true, notes: true });

export const appointmentActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("complete") }),
  z.object({ action: z.literal("reschedule"), slotStart: z.string().datetime({ offset: true }) }),
]);

export const contactFormSchema = z.object({
  name: z.string().trim().min(1, "validation.required").max(80, "validation.nameMax"),
  email: emailSchema,
  subject: z.string().trim().min(1, "validation.subject").max(120, "validation.subject"),
  message: z.string().trim().min(10, "validation.messageMin").max(1000, "validation.messageMax"),
  website: z.string().max(0).optional(), // honeypot
});

export const staffLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "validation.password").max(72, "validation.password"),
});

export const staffAccountSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  password: z.string().min(8, "validation.password").max(72, "validation.password"),
  role: z.enum(["doctor", "admin"]),
});

/** Patient sign-up details; the phone/email is collected and verified separately via OTP. */
export const registerSchema = z.object({
  fullName: nameSchema,
  language: z.enum(["en", "si", "ta"]),
  agree: z.boolean().refine((v) => v, "validation.agree"),
});

export const profileSchema = z.object({
  full_name: nameSchema,
  language: z.enum(["en", "si", "ta"]),
});

const intField = (min, max) =>
  z.coerce.number({ message: "validation.number" }).int("validation.number").min(min, "validation.number").max(max, "validation.number");

export const doctorSchema = z.object({
  name: nameSchema,
  specialty_id: z.string().uuid("validation.select"),
  hospital_id: z.string().uuid("validation.select"),
  experience_years: intField(0, 70),
  fee: z.coerce.number({ message: "validation.number" }).min(0, "validation.number").max(1000000, "validation.number"),
  bio: z.string().trim().max(2000).optional().transform((v) => v || null),
  photo_url: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "validation.required")
    .optional()
    .transform((v) => v || null),
  user_id: z
    .string()
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || z.string().uuid().safeParse(v).success, "validation.select"),
  active: z.boolean(),
});

export const hospitalSchema = z.object({
  name: z.string().trim().min(2, "validation.nameMin").max(120, "validation.nameMax"),
  district: z.string().trim().min(2, "validation.required").max(40),
  address: z.string().trim().max(250).optional().transform((v) => v || null),
});

export const specialtySchema = z.object({
  name_en: z.string().trim().min(2, "validation.nameMin").max(80),
  name_si: z.string().trim().min(1, "validation.required").max(80),
  name_ta: z.string().trim().min(1, "validation.required").max(80),
});

export const availabilitySchema = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, "validation.required"),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, "validation.required"),
    slot_minutes: intField(5, 120),
  })
  .refine((v) => v.end_time > v.start_time, { message: "validation.time", path: ["end_time"] });

export const blockDateSchema = z.object({
  blocked_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validation.required"),
  reason: z.string().trim().max(200).optional().transform((v) => v || null),
});

export const labUploadSchema = z
  .object({
    invoice_number: invoiceSchema,
    test_name: z.string().trim().min(2, "validation.required").max(120),
    patient_name: z.string().trim().max(120).optional().transform((v) => v || null),
    patient_phone: z
      .string()
      .trim()
      .optional()
      .transform((v, ctx) => {
        if (!v) return null;
        const p = normalizePhone(v);
        if (!p) {
          ctx.addIssue({ code: "custom", message: "validation.phone" });
          return z.NEVER;
        }
        return p;
      }),
    patient_email: optionalEmail,
    appointment_id: z
      .string()
      .optional()
      .transform((v) => v || null),
  })
  .refine((v) => v.patient_phone || v.patient_email, { message: "validation.phone", path: ["patient_phone"] });

/** Uniform API error body: { error: "<code>" } where code maps to login.errors.<code>. */
export const apiError = (code, status = 400) => Response.json({ error: code }, { status });
