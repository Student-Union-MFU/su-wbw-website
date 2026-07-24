// ตัวช่วยเรียก backend — ผ่าน apiUrl() (proxy /api หรือยิงตรง แล้วแต่ NEXT_PUBLIC_API_BASE)
import { apiUrl } from "@/lib/apiBase";

export type School = { school_id: number; name: string };

/** โหลดรายชื่อสำนักวิชา */
export async function getSchools(): Promise<School[]> {
  const res = await fetch(apiUrl("/api/admin/schools"));
  if (!res.ok) throw new Error("โหลดรายชื่อสำนักวิชาไม่สำเร็จ");
  return res.json();
}
