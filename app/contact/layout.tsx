import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

/* layout ตัวนี้มีไว้ประกาศ metadata อย่างเดียว — page.tsx ของหน้านี้เป็น client component
   (ใช้ context ภาษา) จึง export metadata เองไม่ได้ · ดูคำอธิบายใน lib/seo.ts */
export const metadata: Metadata = pageMetadata({
  title: "ติดต่อเรา · Contact",
  description:
    "ช่องทางติดต่อองค์การนักศึกษา มหาวิทยาลัยแม่ฟ้าหลวง สำหรับคำถามเรื่องกิจกรรมเดินรอบดอย 2569 · Contact the Student Union of Mae Fah Luang University about the event.",
  path: "/contact",
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
