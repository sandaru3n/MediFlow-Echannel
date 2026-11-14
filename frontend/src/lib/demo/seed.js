// Hardcoded sample data used when Supabase isn't configured (demo mode).
// All people, hospitals and contact details are fictional.

import { addDays, todayLK } from "@/lib/utils";

export const DEMO_PASSWORD = "demo1234";
export const DEMO_ACCOUNTS = {
  patientPhone: "077 123 4567",
  doctorEmail: "doctor@mediflow.lk",
  adminEmail: "admin@mediflow.lk",
  labInvoice: "INV-10001",
};

const id = (prefix, n) => `${prefix}-0000-4000-8000-${String(n).padStart(12, "0")}`;
const SPEC = (n) => id("5e000000", n);
const HOSP = (n) => id("40000000", n);
export const DOC = (n) => id("d0000000", n);

export const USERS = {
  patient: id("a0000000", 1),
  doctor: id("a0000000", 2),
  admin: id("a0000000", 3),
};

const specialties = [
  ["Cardiology", "හෘද රෝග", "இதயவியல்"],
  ["Paediatrics", "ළමා රෝග", "குழந்தை மருத்துவம்"],
  ["Dermatology", "චර්ම රෝග", "தோல் மருத்துவம்"],
  ["Neurology", "ස්නායු රෝග", "நரம்பியல்"],
  ["Obstetrics & Gynaecology", "ප්‍රසව හා නාරිවේද", "மகப்பேறு மற்றும் மகளிர் மருத்துவம்"],
  ["General Medicine", "සාමාන්‍ය වෛද්‍ය", "பொது மருத்துவம்"],
  ["ENT", "කන, නාසය, උගුර", "காது, மூக்கு, தொண்டை"],
  ["Orthopaedics", "අස්ථි රෝග", "எலும்பியல்"],
  ["Psychiatry", "මනෝ වෛද්‍ය", "மனநல மருத்துவம்"],
  ["Ophthalmology", "අක්ෂි රෝග", "கண் மருத்துவம்"],
].map(([name_en, name_si, name_ta], i) => ({ id: SPEC(i + 1), name_en, name_si, name_ta }));

const hospitals = [
  ["Lanka Central Hospital", "Colombo", "Sample address, Colombo 07"],
  ["Kandy City Medical Centre", "Kandy", "Sample address, Peradeniya Road, Kandy"],
  ["Southern Coast Hospital", "Galle", "Sample address, Wakwella Road, Galle"],
  ["Northern Care Hospital", "Jaffna", "Sample address, Hospital Road, Jaffna"],
  ["Wayamba General Hospital", "Kurunegala", "Sample address, Colombo Road, Kurunegala"],
  ["Negombo Lagoon Hospital", "Gampaha", "Sample address, Main Street, Negombo"],
  ["Eastern Medical Centre", "Batticaloa", "Sample address, Trinco Road, Batticaloa"],
  ["Rajarata Teaching Hospital", "Anuradhapura", "Sample address, Maithripala Senanayake Mw, Anuradhapura"],
].map(([name, district, address], i) => ({ id: HOSP(i + 1), name, district, address }));

const specId = (name) => specialties.find((s) => s.name_en === name).id;
const hospId = (name) => hospitals.find((h) => h.name === name).id;

// name, specialty, hospital, experience, fee, bio
const doctorRows = [
  ["Dr. Nimal Perera", "Cardiology", "Lanka Central Hospital", 18, 4500, "Consultant cardiologist focusing on hypertension, chest pain evaluation and preventive heart care."],
  ["Dr. Shalini Fernando", "Paediatrics", "Kandy City Medical Centre", 11, 3000, "Consultant paediatrician providing child wellness checks, vaccination advice and care for common childhood illnesses."],
  ["Dr. Arun Rajan", "Dermatology", "Northern Care Hospital", 9, 2800, "Dermatologist treating eczema, acne, psoriasis and skin allergies for all ages."],
  ["Dr. Kumudu Silva", "Neurology", "Lanka Central Hospital", 21, 5000, "Consultant neurologist with a special interest in headache, epilepsy and stroke follow-up."],
  ["Dr. Dilani Jayasinghe", "Obstetrics & Gynaecology", "Southern Coast Hospital", 14, 3500, "Consultant obstetrician and gynaecologist offering antenatal care and women's health services."],
  ["Dr. Suresh Nadarajah", "General Medicine", "Eastern Medical Centre", 8, 2200, "Physician managing diabetes, blood pressure, thyroid and general adult health."],
  ["Dr. Chaminda Wickrama", "ENT", "Kandy City Medical Centre", 12, 3300, "ENT surgeon handling hearing assessment, sinus problems and throat disorders."],
  ["Dr. Ruwan Bandara", "Orthopaedics", "Wayamba General Hospital", 16, 4000, "Orthopaedic surgeon treating joint pain, sports injuries and fractures."],
  ["Dr. Fathima Rizwan", "Psychiatry", "Lanka Central Hospital", 10, 3800, "Psychiatrist supporting anxiety, depression and sleep problems with a confidential, caring approach."],
  ["Dr. Priyanka Gunawardena", "Ophthalmology", "Negombo Lagoon Hospital", 13, 3200, "Eye specialist for cataract assessment, glaucoma screening and diabetic eye checks."],
  ["Dr. Kavitha Sivakumar", "Paediatrics", "Northern Care Hospital", 7, 2500, "Paediatrician caring for newborns and children, with a focus on nutrition and growth."],
  ["Dr. Mahesh Rathnayake", "Cardiology", "Rajarata Teaching Hospital", 15, 3600, "Cardiologist providing ECG review, heart failure care and cardiac risk assessment."],
  ["Dr. Ayesha Mohamed", "Dermatology", "Negombo Lagoon Hospital", 6, 2600, "Dermatologist with an interest in pigmentation, hair loss and cosmetic skin concerns."],
  ["Dr. Lasantha Herath", "General Medicine", "Wayamba General Hospital", 19, 2400, "Senior physician for chronic disease follow-up, fever and general health checks."],
  ["Dr. Tharindu Senanayake", "Orthopaedics", "Southern Coast Hospital", 9, 3700, "Orthopaedic surgeon focusing on knee and shoulder problems and post-injury rehabilitation."],
  ["Dr. Sanjeewa Abeysekara", "Neurology", "Kandy City Medical Centre", 17, 4600, "Neurologist managing migraine, nerve pain, Parkinson's disease and memory concerns."],
  ["Dr. Meera Thevarajah", "Neurology", "Northern Care Hospital", 12, 3900, "Consultant neurologist offering seizure care, EEG review and stroke rehabilitation planning."],
  ["Dr. Nadeesha Karunaratne", "Obstetrics & Gynaecology", "Lanka Central Hospital", 20, 4800, "Senior obstetrician and gynaecologist for high-risk pregnancy, fertility advice and menopause care."],
  ["Dr. Zainab Hameed", "Obstetrics & Gynaecology", "Eastern Medical Centre", 9, 3000, "Gynaecologist providing antenatal check-ups, family planning and adolescent health guidance."],
  ["Dr. Pradeep Liyanage", "ENT", "Southern Coast Hospital", 14, 3400, "ENT consultant for tonsil and adenoid problems, ear infections and voice disorders."],
  ["Dr. Gayani Dissanayake", "ENT", "Rajarata Teaching Hospital", 8, 2700, "ENT specialist treating allergies, nosebleeds, hearing loss and dizziness."],
  ["Dr. Roshan Ekanayake", "Psychiatry", "Kandy City Medical Centre", 15, 4000, "Psychiatrist experienced in mood disorders, stress management and addiction support."],
  ["Dr. Anushka de Mel", "Psychiatry", "Negombo Lagoon Hospital", 7, 3200, "Child and adolescent psychiatrist helping with attention, behaviour and learning difficulties."],
  ["Dr. Vijay Paramanathan", "Ophthalmology", "Northern Care Hospital", 18, 3500, "Ophthalmologist for cataract surgery assessment, retinal checks and vision problems."],
  ["Dr. Ishara Weerasinghe", "Ophthalmology", "Wayamba General Hospital", 10, 3000, "Eye surgeon focusing on children's eye health, squint and refractive errors."],
  ["Dr. Upul Jayawardena", "Cardiology", "Southern Coast Hospital", 22, 5200, "Interventional cardiologist for angiogram review, cholesterol management and post-stent care."],
  ["Dr. Hiruni Samarasinghe", "Paediatrics", "Lanka Central Hospital", 13, 3400, "Paediatrician with a special interest in childhood asthma, allergies and developmental checks."],
  ["Dr. Imran Farook", "Dermatology", "Kandy City Medical Centre", 11, 3100, "Dermatologist treating fungal infections, skin rashes, nail disorders and scars."],
  ["Dr. Sivapalan Kanagaratnam", "General Medicine", "Northern Care Hospital", 24, 2600, "Senior physician for elderly care, diabetes control and long-term medication reviews."],
  ["Dr. Chathura Gamage", "Orthopaedics", "Rajarata Teaching Hospital", 12, 3600, "Orthopaedic surgeon for back pain, osteoporosis, arthritis and fracture follow-up."],
];

const doctors = doctorRows.map(([name, spec, hosp, experience_years, fee, bio], i) => ({
  id: DOC(i + 1),
  user_id: i === 0 ? USERS.doctor : null,
  name,
  specialty_id: specId(spec),
  hospital_id: hospId(hosp),
  experience_years,
  fee,
  bio,
  photo_url: null,
  active: true,
}));

/** Weekly hours: the demo doctor works every day so "today" always has a session. */
function buildAvailability() {
  const out = [];
  let n = 1;
  const add = (doctor_id, weekday, start_time, end_time, slot_minutes) =>
    out.push({ id: id("a1000000", n++), doctor_id, weekday, start_time, end_time, slot_minutes });
  for (let wd = 0; wd < 7; wd++) {
    add(DOC(1), wd, "09:00:00", "12:00:00", 15);
    add(DOC(1), wd, "16:00:00", "20:00:00", 15);
  }
  doctors.slice(1).forEach((d, i) => {
    const evening = i % 2 === 0;
    [i % 7, (i + 2) % 7, (i + 4) % 7].forEach((wd) =>
      add(d.id, wd, evening ? "16:00:00" : "08:30:00", evening ? "19:00:00" : "11:30:00", i % 3 === 0 ? 20 : 15),
    );
  });
  return out;
}

const at = (date, hhmm) => `${date}T${hhmm}:00+05:30`;
const plusMin = (iso, m) => new Date(new Date(iso).getTime() + m * 60_000).toISOString().replace(".000Z", "+00:00");

export function buildSeed() {
  const today = todayLK();
  const availability = buildAvailability();

  const appt = (n, doctorIdx, date, hhmm, status, patient, notes = null, mins = 15) => ({
    id: id("ab000000", n),
    reference: `MF-DEMO${String(n).padStart(3, "0")}`,
    doctor_id: DOC(doctorIdx),
    patient_id: patient.id ?? null,
    patient_name: patient.name,
    patient_phone: patient.phone,
    patient_email: patient.email ?? null,
    slot_start: at(date, hhmm),
    slot_end: plusMin(at(date, hhmm), mins),
    status,
    notes,
    created_at: new Date(Date.now() - n * 3600_000).toISOString(),
  });
  const me = { id: USERS.patient, name: "Kasun Perera", phone: "+94771234567", email: "kasun@example.com" };
  const others = [
    { name: "Sanduni Wijesinghe", phone: "+94712345678" },
    { name: "Mohamed Rifkhan", phone: "+94759876543" },
    { name: "Tharushi Fernando", phone: "+94763456789" },
    { name: "Ramesh Kumar", phone: "+94701122334" },
  ];

  const appointments = [
    // demo patient
    appt(1, 1, addDays(today, 2), "16:30", "booked", me, "Follow-up for blood pressure."),
    appt(2, 2, addDays(today, -12), "09:00", "completed", me),
    appt(3, 7, addDays(today, -30), "16:15", "cancelled", me),
    // demo doctor's day
    appt(4, 1, today, "09:15", "completed", others[0], "Chest discomfort after exercise."),
    appt(5, 1, today, "10:00", "booked", others[1]),
    appt(6, 1, today, "16:45", "booked", others[2], "Review ECG results."),
    appt(7, 1, today, "18:00", "booked", others[3]),
    appt(8, 1, addDays(today, 1), "09:30", "booked", others[0]),
    appt(9, 1, addDays(today, 3), "17:15", "booked", others[1], "Medication review."),
    appt(10, 4, addDays(today, 5), "16:00", "booked", others[3]),
  ];

  const lab_reports = [
    {
      id: id("1b000000", 1),
      invoice_number: "INV-10001",
      patient_id: USERS.patient,
      appointment_id: appointments[1].id,
      test_name: "Full Blood Count",
      patient_name: me.name,
      patient_phone: me.phone,
      patient_email: me.email,
      file_path: "demo/INV-10001.pdf",
      uploaded_by: USERS.admin,
      created_at: new Date(Date.now() - 10 * 86400_000).toISOString(),
    },
    {
      id: id("1b000000", 2),
      invoice_number: "INV-10002",
      patient_id: USERS.patient,
      appointment_id: null,
      test_name: "Lipid Profile",
      patient_name: me.name,
      patient_phone: me.phone,
      patient_email: me.email,
      file_path: "demo/INV-10002.pdf",
      uploaded_by: USERS.admin,
      created_at: new Date(Date.now() - 3 * 86400_000).toISOString(),
    },
    {
      id: id("1b000000", 3),
      invoice_number: "INV-10003",
      patient_id: null,
      appointment_id: appointments[3].id,
      test_name: "ECG Report",
      patient_name: others[0].name,
      patient_phone: others[0].phone,
      patient_email: null,
      file_path: "demo/INV-10003.pdf",
      uploaded_by: USERS.doctor,
      created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
    },
  ];

  const created = new Date(Date.now() - 40 * 86400_000).toISOString();
  return {
    specialties,
    hospitals,
    doctors,
    availability,
    blocked_dates: [{ id: id("b1000000", 1), doctor_id: DOC(1), blocked_on: addDays(today, 10), reason: "Medical conference" }],
    appointments,
    lab_reports,
    profiles: [
      { id: USERS.patient, full_name: me.name, phone: me.phone, email: null, language: "en", created_at: created },
      { id: USERS.doctor, full_name: "Dr. Nimal Perera", phone: null, email: DEMO_ACCOUNTS.doctorEmail, language: "en", created_at: created },
      { id: USERS.admin, full_name: "Demo Administrator", phone: null, email: DEMO_ACCOUNTS.adminEmail, language: "en", created_at: created },
    ],
    user_roles: [
      { id: id("e0000000", 1), user_id: USERS.patient, role: "patient" },
      { id: id("e0000000", 2), user_id: USERS.doctor, role: "doctor" },
      { id: id("e0000000", 3), user_id: USERS.admin, role: "admin" },
    ],
    // Staff password logins (demo only — never do this with real credentials).
    credentials: [
      { email: DEMO_ACCOUNTS.doctorEmail, password: DEMO_PASSWORD, user_id: USERS.doctor },
      { email: DEMO_ACCOUNTS.adminEmail, password: DEMO_PASSWORD, user_id: USERS.admin },
    ],
    contact_messages: [],
  };
}
