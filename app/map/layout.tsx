import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

/* layout ตัวนี้มีไว้ประกาศ metadata อย่างเดียว — page.tsx ของหน้านี้เป็น client component
   (ใช้ context ภาษา) จึง export metadata เองไม่ได้ · ดูคำอธิบายใน lib/seo.ts */
export const metadata: Metadata = pageMetadata({
  title: "แผนที่ 3D · Map",
  description:
    "แผนที่สามมิติของพื้นที่รอบมหาวิทยาลัยแม่ฟ้าหลวง พร้อมเส้นทางเดินรอบดอย หมุนและซูมดูได้ · Interactive 3D map of the Mae Fah Luang University campus and the walking route.",
  path: "/map",
});

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
