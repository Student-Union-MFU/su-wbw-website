/**
 * ช่วงเวลาของวันที่ฉากป่าใช้ได้จริง
 *
 * แยกออกมาเป็นโมดูลเล็ก ๆ ที่ไม่แตะ three.js เลย — หน้าที่ใช้ฉาก (register /
 * dashboard) โหลด ForestScene แบบ dynamic เพื่อกัน three.js เข้า bundle หลัก
 * ถ้า import ค่าพวกนี้จาก ForestScene ตรง ๆ three.js จะถูกลากกลับเข้ามาทันที
 */

/** ไม่ใช้ 0..1 เต็ม — ปลายทั้งสองข้าง (ก่อนฟ้าสาง / ตะวันลับดอย) มืดเกินกว่าจะอ่านฟอร์มที่ลอยทับ */
export const DAY_FROM = 0.14;
export const DAY_TO = 0.78;

/** step ของฟอร์ม → ช่วงเวลาของวัน (หน้าสมัครใช้) */
export function dayForStep(step: number, steps: number) {
  const t = steps > 1 ? Math.min(Math.max(step, 0), steps - 1) / (steps - 1) : 0;
  return DAY_FROM + (DAY_TO - DAY_FROM) * t;
}

/** เวลากลางวันนิ่ง ๆ สำหรับหน้าที่ไม่มี step (เข้าสู่ระบบ) */
export const DAY_STILL = 0.46;
