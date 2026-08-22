import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

/* layout ตัวนี้มีไว้ประกาศ metadata อย่างเดียว — page.tsx ของหน้านี้เป็น client component
   (ใช้ context ภาษา) จึง export metadata เองไม่ได้ · ดูคำอธิบายใน lib/seo.ts */
export const metadata: Metadata = pageMetadata({
  title: "ช่วยเหลือ · Support",
  description:
    "คำถามที่พบบ่อยเรื่องกิจกรรมเดินรอบดอย 2569 และแอปพลิเคชันบน iOS — เข้าสู่ระบบ เช็กอินที่ฐาน ปุ่ม SOS สิทธิ์ตำแหน่ง และการขอลบบัญชี พร้อมช่องทางติดต่อองค์การนักศึกษา · Help and FAQ for the Walk Beyond the Wild 2026 event and its iOS app.",
  path: "/support",
});

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
