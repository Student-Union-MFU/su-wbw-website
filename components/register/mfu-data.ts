/* ============================================================
   สำนักวิชา — เดิมโหลดจาก GET /api/admin/schools ตอนเปิดหน้า
   ย้ายมาเก็บในไฟล์นี้: ฟอร์มไม่ต้องรอ backend และไม่พังเวลา API ล่ม

   ⚠ school_id ต้องตรงกับตาราง school ใน backend เพราะ participant_profile
   มี FK: school_id INT REFERENCES school(school_id) — ส่ง id ผิด = สมัครไม่ผ่าน
   หรือสังกัดผิดสำนัก

   ค่าด้านล่างอ้างอิงลำดับ INSERT ใน backend/db/init/02_seed.sql ซึ่งใช้
   SERIAL PRIMARY KEY (ไม่ได้ระบุ id เอง) → id ไล่ตามลำดับที่ INSERT
   ⚠ ลำดับ INSERT ไม่ได้เรียงตามตัวอักษร — Applied Digital Technology = 5 ไม่ใช่ 2
   ถ้า reseed DB ใหม่ / เพิ่มสำนักวิชา ต้องมาแก้ตรงนี้ให้ตรงด้วย
   ตรวจได้ด้วย: SELECT school_id, name FROM school ORDER BY school_id;
   ============================================================ */
export type School = { school_id: number; name: string };

export const SCHOOLS: School[] = [
  { school_id: 1, name: "School of Agro-Industry" },
  { school_id: 2, name: "School of Cosmetic Science" },
  { school_id: 3, name: "School of Dentistry" },
  { school_id: 4, name: "School of Health Science" },
  { school_id: 5, name: "School of Applied Digital Technology" },
  { school_id: 6, name: "School of Integrative Medicine" },
  { school_id: 7, name: "School of Law" },
  { school_id: 8, name: "School of Liberal Arts" },
  { school_id: 9, name: "School of Management" },
  { school_id: 10, name: "School of Medicine" },
  { school_id: 11, name: "School of Nursing" },
  { school_id: 12, name: "School of Science" },
  { school_id: 13, name: "School of Sinology" },
  { school_id: 14, name: "School of Social Innovation" },
];

/* หมายเหตุ: เว็บ มฟล. มี "School of Anti-Aging and Regenerative Medicine" เพิ่มอีก 1
   แต่ไม่มีใน seed ของ backend (น่าจะเพราะเปิดสอนระดับบัณฑิตศึกษา ไม่ใช่ ป.ตรี 693xxxxxxx)
   ถ้าจะเพิ่ม ต้อง INSERT ในตาราง school ก่อน แล้วค่อยเติม id ที่ได้มาที่นี่ */

/** เรียงตามตัวอักษรสำหรับ dropdown (เดิม API ส่งมาแบบ ORDER BY name) */
export const SCHOOLS_BY_NAME: School[] = [...SCHOOLS].sort((a, b) =>
  a.name.localeCompare(b.name),
);

// รหัสนักศึกษา MFU: หลัก 4-5 (2 ตัวหลัง 693) = รหัสสำนักวิชา → auto-select
// key = ชื่อ school ตรงกับ seed (backend/db/init/02_seed.sql)
export const SCHOOL_BY_CODE: Record<string, string> = {
  "10": "School of Liberal Arts",
  "11": "School of Science",
  "12": "School of Management",
  "14": "School of Agro-Industry",
  "15": "School of Applied Digital Technology",
  "16": "School of Law",
  "17": "School of Cosmetic Science",
  "18": "School of Health Science",
  "19": "School of Nursing",
  "21": "School of Medicine",
  "22": "School of Dentistry",
  "23": "School of Social Innovation",
  "24": "School of Sinology",
  "25": "School of Integrative Medicine",
};

// สาขา (major) ต่อสำนักวิชา — แสดงบนแอป
export const MAJORS_BY_SCHOOL: Record<string, string[]> = {
  "School of Agro-Industry": [
    "Innovation Food Science and Technology",
    "Postharvest Technology and Logistics",
  ],
  "School of Cosmetic Science": ["Beauty Technology", "Cosmetic Science"],
  "School of Dentistry": ["Dental Assistant", "Dental Surgery"],
  "School of Health Science": [
    "Environmental Health",
    "Occupational Health and Safety",
    "Public Health",
    "Sports and Health Science",
  ],
  "School of Applied Digital Technology": [
    "Computer Engineering",
    "Digital and Communication Engineering",
    "Digital Technology for Business Innovation",
    "Multimedia Technology and Animation",
    "Software Engineering",
    "Computer Science and Innovation",
  ],
  "School of Integrative Medicine": [
    "Applied Thai Traditional Medicine",
    "Physical Therapy",
    "Traditional Chinese Medicine",
  ],
  "School of Law": ["Laws", "Business Law and Chinese Communication"],
  "School of Liberal Arts": ["English", "Thai Language and Culture for Foreigners"],
  "School of Management": ["Accounting", "Business Management", "Economics"],
  "School of Medicine": ["Medicine"],
  "School of Nursing": ["Practical Nursing", "Nursing Science"],
  "School of Science": [
    "Applied Chemistry",
    "Biotechnology (Biological Science)",
    "Materials Engineering",
  ],
  "School of Sinology": [
    "Business Chinese",
    "Chinese Language and Culture",
    "Chinese Studies",
    "Teaching Chinese Language",
  ],
  "School of Social Innovation": ["International Development"],
};

/* ============================================================
   หน้าที่ของเจ้าหน้าที่ (ฟอร์ม /auth/staff/register)

   ⚠ ต้องตรงกับ enum staff_role ใน backend (migration 000009_staff_profile)
   และ validStaffRoles ใน internal/service/wbw_auth_service.go
   เพิ่มหน้าที่ใหม่ = แก้ทั้ง 3 ที่ + เพิ่มคำแปลใน staffAuth.register.roles
   ============================================================ */
export const STAFF_ROLES = [
  "registration",
  "checkpoint",
  "backstage",
  "security",
  "medical",
  "welfare",
  "logistics",
  "media",
  "guide",
  "other",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];
