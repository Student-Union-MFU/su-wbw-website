import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

/* layout ตัวนี้มีไว้ประกาศ metadata อย่างเดียว — page.tsx ของหน้านี้เป็น client component
   (ใช้ context ภาษา) จึง export metadata เองไม่ได้ · ดูคำอธิบายใน lib/seo.ts */
export const metadata: Metadata = pageMetadata({
  title: "เส้นทางเดินรอบดอย · The route",
  description:
    "เดิน 6 กิโลเมตรรอบดอยแม่ฟ้าหลวง ออกจากลานเฉลิมพระเกียรติตั้งแต่ฟ้ายังไม่สาง ผ่านป่าต้นน้ำและสันเขา แวะ 5 ฐานกิจกรรมตลอดทาง · A 6 km walk around Doi Mae Fah Luang through headwater forest and ridgelines, with five activity stops along the way.",
  path: "/landing",
});

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
