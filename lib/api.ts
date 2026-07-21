// ตัวช่วยเรียก backend ผ่าน proxy /api (ตั้งใน next.config.ts)

export type School = { school_id: number; name: string };

/** โหลดรายชื่อสำนักวิชา */
export async function getSchools(): Promise<School[]> {
  const res = await fetch("/api/admin/schools");
  if (!res.ok) throw new Error("โหลดรายชื่อสำนักวิชาไม่สำเร็จ");
  return res.json();
}
