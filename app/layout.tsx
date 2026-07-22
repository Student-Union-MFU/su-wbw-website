import type { Metadata } from "next";
import { Sarabun, Patrick_Hand, Itim, Kanit } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import SceneHost from "@/components/scene/SceneHost";
import "./globals.css";

// ฟอนต์ Sarabun รองรับไทย อ่านง่าย (ตาม design principle: typography ที่อ่านง่าย)
const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

// ลายมือ (คล้าย Yuyu) สำหรับหัว hero "Walk Beyond the Wild"
const hand = Patrick_Hand({
  variable: "--font-hand",
  subsets: ["latin"],
  weight: "400",
});

// ลายมือไทย (Itim) — บรรทัดไทยใต้หัว hero ให้เข้าชุดกับ Patrick Hand
const handTh = Itim({
  variable: "--font-hand-th",
  subsets: ["thai", "latin"],
  weight: "400",
});

// Kanit — footer
const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600"],
});

/* metadata ออกจาก server — สลับตามภาษาที่ client เลือกไม่ได้ (ไม่มี /en ใน URL)
   จึงใส่ทั้งสองภาษาไว้ ส่วน title ของแท็บ LanguageProvider จะอัปเดตให้หลัง mount */
export const metadata: Metadata = {
  title: "สมัครเข้าร่วม · เดินรอบดอย 2569 · Walk Beyond the Wild",
  description:
    "ลงทะเบียนกิจกรรมเดินรอบดอย มหาวิทยาลัยแม่ฟ้าหลวง · Register for Walk Beyond the Wild, Mae Fah Luang University",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${sarabun.variable} ${hand.variable} ${handTh.variable} ${kanit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          {/* Canvas 3D ตัวเดียวของทั้งเว็บ อยู่ที่นี่ ไม่ unmount ตอนเปลี่ยนหน้า
              (กันจอเขียวแวบ + ประหยัดหน่วยความจำ) · หน้าต่าง ๆ สั่งฉากผ่าน context */}
          <SceneHost>{children}</SceneHost>
        </LanguageProvider>
      </body>
    </html>
  );
}
