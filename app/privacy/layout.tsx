import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

/* layout ตัวนี้มีไว้ประกาศ metadata อย่างเดียว — page.tsx ของหน้านี้เป็น client component
   (ใช้ context ภาษา) จึง export metadata เองไม่ได้ · ดูคำอธิบายใน lib/seo.ts */
export const metadata: Metadata = pageMetadata({
  title: "นโยบายความเป็นส่วนตัว · Privacy Policy",
  description:
    "นโยบายความเป็นส่วนตัวของกิจกรรมเดินรอบดอย 2569 และแอปพลิเคชันบน iOS — เก็บข้อมูลอะไร ใครเห็นบ้าง เก็บนานแค่ไหน และใช้สิทธิตาม PDPA ได้อย่างไร · Privacy policy for the Walk Beyond the Wild 2026 event and its iOS app.",
  path: "/privacy",
});

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
