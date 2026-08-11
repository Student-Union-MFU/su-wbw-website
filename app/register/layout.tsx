import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

/* layout ตัวนี้มีไว้ประกาศ metadata อย่างเดียว — page.tsx ของหน้านี้เป็น client component
   (ใช้ context ภาษา) จึง export metadata เองไม่ได้ · ดูคำอธิบายใน lib/seo.ts */
export const metadata: Metadata = pageMetadata({
  title: "สมัครเข้าร่วม · Register",
  description:
    "ลงทะเบียนเข้าร่วมกิจกรรมเดินรอบดอย 2569 ออนไลน์ ใช้เวลาไม่ถึง 5 นาที เปิดรับถึง 29 ส.ค. 2569 · Register online for Walk Beyond the Wild 2026 in under five minutes.",
  path: "/register",
});

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
