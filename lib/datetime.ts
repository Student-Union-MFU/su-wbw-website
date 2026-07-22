/**
 * แปลง timestamp จาก backend (Postgres) ให้ JS Date อ่านได้
 *
 * Postgres ส่งมาแบบ "2026-07-22 02:23:33.812531+00" ซึ่ง new Date() พังทันที
 * (Invalid Date) เพราะ (1) เว้นวรรคแทน T, (2) ไมโครวินาที 6 หลัก, และตัวการหลักคือ
 * (3) โซนเวลาเขียนเป็น "+00" ไม่ใช่ "+00:00"/"Z" ที่ ES ต้องการ
 */
export function parseTs(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  let s = String(iso).trim().replace(" ", "T");
  s = s.replace(/(\.\d{3})\d+/, "$1"); // ไมโครวินาที -> มิลลิวินาที
  s = s.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"); // +0700 -> +07:00
  s = s.replace(/([+-]\d{2})$/, "$1:00"); // +00 -> +00:00
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** format timestamp เป็นข้อความตาม locale · คืน iso เดิมถ้าแปลงไม่ได้ (ไม่โชว์ "Invalid Date") */
export function formatTs(
  iso: string | null | undefined,
  locale: string,
  opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" },
): string {
  const d = parseTs(iso);
  return d ? d.toLocaleString(locale, opts) : (iso ?? "");
}
