# MediFlow

Online doctor channeling and secure lab reports for Sri Lanka, in English, සිංහල and தமிழ்.

- `frontend/` — Next.js (App Router) in JavaScript/JSX, Tailwind CSS v4, shadcn‑style UI on Radix, TanStack Query, React Hook Form + Zod, react‑i18next.
- `backend/supabase/` — Postgres migrations (schema, functions, Row Level Security, private storage bucket) and seed data.
- `res/` — the original reference sources (read‑only design reference; not used by the build).

## Features

| Route | What it does |
| --- | --- |
| `/` | Hero, doctor search, quick actions |
| `/doctors` | Filter by text, specialty, district, hospital and date; skeletons and empty states |
| `/doctors/[id]` | Doctor profile, real available slots only, booking form and confirmation with a reference |
| `/login` | Patient sign‑in with a one‑time code (phone or email), quick lab report download (invoice + code), staff sign‑in (password or code) |
| `/dashboard` | Patient: upcoming/past appointments, reschedule, cancel (with confirmation), lab reports, profile |
| `/doctor` | Doctor: today's and upcoming appointments, mark completed, cancel, weekly hours, blocked dates, lab report upload |
| `/admin` | Admin: stats, doctors (CRUD + schedules), hospitals, specialties, users and roles, staff accounts, all appointments, lab reports |
| `/about`, `/contact`, `/privacy`, `/terms` | Static pages; the contact form is stored server‑side with rate limiting and a honeypot |

## Security model

- RLS is enabled on every table. Patients see only their own appointments and reports, doctors only their own appointments, admins everything.
- Roles live in `user_roles` and are checked with the `has_role()` security‑definer function; they are never stored on `profiles`.
- Appointments are written only through security‑definer RPCs (`book_appointment`, `reschedule_appointment`, `cancel_appointment`, `complete_appointment`). A partial unique index on `(doctor_id, slot_start) where status = 'booked'` prevents double booking.
- One‑time codes are hashed with `OTP_SECRET`, expire after 5 minutes, allow a limited number of attempts and are rate‑limited per contact and per IP. The `otp_codes` table is inaccessible to clients.
- Lab report PDFs live in the private `lab-reports` bucket and are served only via short‑lived signed URLs (after OTP verification for the quick download).
- All input is validated with the same Zod schemas on the client and in the route handlers. Only the anon key is sent to the browser.

## Demo mode (no backend)

If `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not set, the app runs on hardcoded sample data (`frontend/src/lib/demo/`): 10 specialties, 8 hospitals, 30 doctors, appointments and lab reports. Changes are saved in the browser's localStorage; clear the site data in your browser to restore the seed. One‑time codes are shown on screen.

| Role | Sign in with |
| --- | --- |
| Patient | Mobile `077 123 4567` (code shown on screen) |
| Doctor | `doctor@mediflow.lk` / `demo1234` |
| Admin | `admin@mediflow.lk` / `demo1234` |
| Quick lab download | Invoice `INV-10001` + `077 123 4567` |

```bash
cd frontend && npm install && npm run dev
```

As soon as the Supabase variables are set, the real backend is used and demo mode is off.

## Setup