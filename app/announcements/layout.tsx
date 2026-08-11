import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

/* layout ตัวนี้มีไว้ประกาศ metadata อย่างเดียว — page.tsx ของหน้านี้เป็น client component
   (ใช้ context ภาษา) จึง export metadata เองไม่ได้ · ดูคำอธิบายใน lib/seo.ts */
export const metadata: Metadata = pageMetadata({
  title: "ประกาศ · Announcements",
  description:
    "ประกาศและข่าวสารล่าสุดเกี่ยวกับกิจกรรมเดินรอบดอย 2569 จากองค์การนักศึกษา มหาวิทยาลัยแม่ฟ้าหลวง · Latest announcements about Walk Beyond the Wild 2026.",
  path: "/announcements",
});

export default function AnnouncementsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
