// ตัวช่วยเรียก backend — ผ่าน apiUrl() (proxy /api หรือยิงตรง แล้วแต่ NEXT_PUBLIC_API_BASE)
import { apiUrl } from "@/lib/apiBase";

export type School = { school_id: number; name: string };

/** โหลดรายชื่อสำนักวิชา */
export async function getSchools(): Promise<School[]> {
  const res = await fetch(apiUrl("/api/admin/schools"));
  if (!res.ok) throw new Error("โหลดรายชื่อสำนักวิชาไม่สำเร็จ");
  return res.json();
}

export type Capacity = {
  max: number;
  taken: number;
  seats_left: number;
  full: boolean;
};

/** จำนวนที่นั่งคงเหลือของงาน — หน้าสมัครเรียกก่อนแสดงฟอร์ม จะได้ไม่ปล่อยให้กรอกจนจบแล้วค่อยบอกว่าเต็ม
 *
 *  เพดานจริงบังคับที่ฐานข้อมูล (migration 000021 ฝั่ง su-server) ตัวเลขนี้เป็นแค่ "ป้ายบอก"
 *  ระหว่างที่กรอกฟอร์มอาจมีคนสมัครจนเต็มพอดี — ปลายทางจึงยังตอบ 409 ได้อยู่ ต้องรับมือทั้งสองทาง */
export async function getCapacity(): Promise<Capacity> {
  const res = await fetch(apiUrl("/api/capacity"));
  if (!res.ok) throw new Error("โหลดจำนวนที่นั่งไม่สำเร็จ");
  return res.json();
}
