import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

/* layout ตัวนี้มีไว้ประกาศ metadata อย่างเดียว — page.tsx ของหน้านี้เป็น client component
   (ใช้ context ภาษา + ฟอร์มลบบัญชี) จึง export metadata เองไม่ได้ · ดูคำอธิบายใน lib/seo.ts */
export const metadata: Metadata = pageMetadata({
  title: "ความเป็นส่วนตัว · Privacy",
  description:
    "นโยบายความเป็นส่วนตัว ข้อมูลที่เก็บ และการลบบัญชีของกิจกรรมเดินรอบดอย มหาวิทยาลัยแม่ฟ้าหลวง · Privacy policy, what data is collected, and self-service account deletion for Walk Beyond the Wild.",
  path: "/privacy",
});

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
