/* ============================================================
   ส่งออกเป็นไฟล์ CSV

   สองเส้นทางในไฟล์เดียว เพราะปลายทางเหมือนกันแต่ที่มาต่างกัน:

   - saveServerCSV: ไฟล์ที่ backend สร้าง (ทะเบียนผู้เข้าร่วม/เจ้าหน้าที่) —
     ข้อมูลเต็มกว่าที่หน้าเว็บโหลดมาไว้ และ query เดียวจบ
   - saveCSV: ไฟล์ที่ประกอบจากก้อนที่หน้าเว็บถืออยู่แล้ว (สถิติในแท็บวิเคราะห์) —
     ยิงซ้ำไป backend เพื่อขอสิ่งที่อยู่ในมือแล้วไม่ได้อะไรเพิ่ม
   ============================================================ */

/** อักขระที่ Excel บนวินโดวส์ใช้เดาว่าไฟล์เป็น UTF-8
 *
 *  ไม่มีตัวนี้ ชื่อภาษาไทยทุกชื่อกลายเป็นอักขระขยะเมื่อเปิดด้วย Excel — และคน
 *  เปิดไฟล์จะสรุปว่าระบบส่งออกพัง ไม่ใช่ว่า Excel เดาการเข้ารหัสผิด */
const BOM = "﻿";

/** ครอบค่าหนึ่งช่องตามกติกา CSV (RFC 4180)
 *
 *  ครอบด้วยเครื่องหมายคำพูดเสมอเมื่อมีตัวคั่น/บรรทัดใหม่/เครื่องหมายคำพูดอยู่ข้างใน
 *  และ escape เครื่องหมายคำพูดด้วยการเขียนซ้ำสองตัว · ข้อความจากผู้ใช้ (ความเห็น
 *  ต่อฐาน ข้อความแชท) มีทั้งจุลภาคและขึ้นบรรทัดใหม่ได้จริง การต่อสตริงตรง ๆ
 *  จะทำให้ไฟล์เลื่อนคอลัมน์ทั้งแถวโดยที่ไฟล์ยังเปิดได้ — บั๊กที่มองไม่เห็น */
function cell(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(header: string[], rows: unknown[][]): string {
  // \r\n ไม่ใช่ \n — RFC 4180 กำหนดไว้แบบนั้น และ Excel รุ่นเก่าบางรุ่นอ่าน
  // \n เดี่ยวเป็นแถวเดียวยาว ๆ
  return BOM + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

/** สั่งเบราว์เซอร์บันทึกไฟล์ · revoke ทันทีหลังกด ไม่งั้น blob ค้างในหน่วยความจำ
 *  ของแท็บจนกว่าจะปิดแท็บ ซึ่งกับไฟล์หลายเมกะไบต์ที่กดหลายรอบเริ่มรู้สึกได้ */
function save(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function saveCSV(filename: string, header: string[], rows: unknown[][]) {
  save(filename, new Blob([toCSV(header, rows)], { type: "text/csv;charset=utf-8" }));
}

/** ดาวน์โหลดไฟล์ที่ backend สร้าง
 *
 *  ต้อง fetch เองแล้วค่อยสร้างลิงก์ ใช้ <a href> ตรง ๆ ไม่ได้ เพราะ endpoint
 *  ต้องการ Authorization header ซึ่งการนำทางของเบราว์เซอร์แนบไปให้ไม่ได้ ·
 *  (ทางเลือกคือย้าย token ไปไว้ใน query string ซึ่งจะไปโผล่ใน access log
 *  ของทุกอย่างที่อยู่ระหว่างทาง — ไม่คุ้ม)
 *
 *  ชื่อไฟล์เอามาจาก Content-Disposition ที่ backend ตั้งไว้ เพื่อให้ชื่อไฟล์
 *  (รวมวันที่) มาจากที่เดียว ไม่ใช่สองที่ที่ค่อย ๆ เพี้ยนออกจากกัน */
export async function saveServerCSV(url: string, token: string, fallbackName: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b.error || "ส่งออกข้อมูลไม่สำเร็จ");
  }
  const named = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "");
  save(named?.[1] ?? fallbackName, await res.blob());
}
