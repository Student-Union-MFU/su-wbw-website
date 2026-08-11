// ข้อมูลร่วมของทุก scenario — สร้าง payload ให้เหมือนที่หน้าเว็บส่งจริง
//
// เส้นทางยิงมี 2 แบบ (สลับด้วย env DIRECT=1):
//   ปกติ  : ผ่าน Next.js proxy (web:3001/api/*) — เส้นทางเดียวกับ production
//   DIRECT : ตรงเข้า Go backend (backend:8080/wbw/*) — ไว้วัด overhead ของ proxy

export const WEB = __ENV.WEB || "http://web:3001";
export const API = __ENV.DIRECT
  ? __ENV.API || "http://backend:8080/wbw"
  : `${WEB}/api`;

export const JSON_HEADERS = { "Content-Type": "application/json" };

// รหัสนักศึกษาต้อง match ^693\d{7}$ (validation ทั้ง client และ server)
// ใช้ iterationInTest (นับรวมทุก VU ไม่ซ้ำกัน) + offset กันชนกันข้าม run/script
export function pad(n, w) {
  return String(n).padStart(w, "0");
}

export function studentId(globalIter, offset) {
  const off = Number(offset ?? __ENV.SID_OFFSET ?? 1000000);
  return "693" + pad(off + globalIter, 7);
}

// รูปโปรไฟล์ ~60KB — หน้าเว็บ crop เป็น JPEG 400×400 แล้วฝังเป็น base64 data URL
// เนื้อ base64 เป็นอะไรก็ได้ (server ไม่ decode) — ขนาด body คือสิ่งที่วัด
const PHOTO =
  "data:image/jpeg;base64," + "iVBORw0KGgoAAAANSUhEUgQmFz".repeat(2300); // ~62KB

// payload สมัคร — โครงเดียวกับ app/auth/participant/register/page.tsx ส่งจริง
// (มี emergency contact ตามที่บังคับใน commit ล่าสุด และเบอร์ขึ้นต้น 0)
export function registerPayload(sid) {
  return JSON.stringify({
    student_id: sid,
    password: "loadtest12345",
    profile: {
      first_name: "โหลด",
      last_name: "เทส" + sid.slice(-4),
      school_id: 1 + (Number(sid.slice(-4)) % 6),
      sex: "unspecified",
      phone: "08" + sid.slice(-8),
      photo_url: PHOTO,
      emergency_contact_name: "ผู้ปกครอง ทดสอบ",
      emergency_contact_phone: "09" + sid.slice(-8),
    },
    medical: {
      birthdate: "2007-01-01",
      weight_kg: 60,
      height_cm: 170,
      blood_type: "O+",
    },
    health: { chronic_conditions: [] },
    consent: {
      consent_health_data: true,
      consent_emergency_treatment: true,
      waiver_accepted: true,
    },
  });
}

// SCALE=0.02 → smoke run ย่อส่วน · default 1 = เต็มสเกล
export const SCALE = Number(__ENV.SCALE || 1);
export function scaled(n) {
  return Math.max(1, Math.round(n * SCALE));
}
