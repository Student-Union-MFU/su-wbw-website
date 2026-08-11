import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

/* layout ตัวนี้มีไว้ประกาศ metadata อย่างเดียว — page.tsx ของหน้านี้เป็น client component
   (ใช้ context ภาษา) จึง export metadata เองไม่ได้ · ดูคำอธิบายใน lib/seo.ts */
export const metadata: Metadata = pageMetadata({
  title: "เกี่ยวกับกิจกรรม · About",
  description:
    "เดินรอบดอย สานต่อรอยปณิธาน ประจำปี 2569 กิจกรรมของนักศึกษามหาวิทยาลัยแม่ฟ้าหลวง ไม่ใช่การแข่งขัน ไม่วัดเวลา ทุกคนเดินไปพร้อมกัน · What Walk Beyond the Wild is, and who runs it.",
  path: "/about",
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
