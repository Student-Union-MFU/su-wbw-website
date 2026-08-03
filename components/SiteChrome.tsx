"use client";

import { usePathname } from "next/navigation";
import NavBar from "@/components/landing/NavBar";

/**
 * แถบเมนูตัวเดียวของทั้งเว็บ — วางไว้ใน layout จึงไม่ unmount ตอนเปลี่ยนหน้า
 * (เหตุผลเดียวกับ SceneHost ที่ถือ Canvas 3D ตัวเดียวไว้)
 *
 * ทำไม: เดิมทุกหน้าเรียก <NavBar /> ของตัวเอง เปลี่ยนหน้าทีนึง React ทิ้งของเดิม
 * แล้ว mount ใหม่ → useSession เริ่มที่ ready=false ทุกครั้ง (แวบเป็นปุ่ม "เข้าสู่ระบบ"
 * ก่อนจะกลายเป็นชื่อ/รูปโปรไฟล์) แถมยิง /api/me ใหม่ทุกหน้า · ตอนนี้ instance เดียว
 * อยู่ยาว เปลี่ยนหน้าแล้วเหลือแค่ลิงก์ที่ active เปลี่ยน
 */

/** เส้นทางที่มีแถบเมนูของตัวเองอยู่แล้ว → ไม่ต้องซ้อน NavBar ฝั่งผู้เข้าร่วมทับ */
const WITHOUT_NAV = ["/dashboard"];

export default function SiteChrome() {
  const pathname = usePathname();
  const hidden = WITHOUT_NAV.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return hidden ? null : <NavBar />;
}
