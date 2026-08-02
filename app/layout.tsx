import type { Metadata } from "next";
import { Bebas_Neue, Kanit } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import SceneHost from "@/components/scene/SceneHost";
import "./globals.css";

// Kanit — ฟอนต์หลักทั้งเว็บ (รองรับไทย+ละติน)
const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Bebas Neue — หัวเรื่องภาษาอังกฤษ (ตัวพิมพ์ใหญ่ล้วน ไม่มี glyph ไทย ห้ามใช้กับข้อความไทย
// → สลับผ่าน headingFont() ใน LanguageProvider)
const bebas = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
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
    <html lang="th" className={`${kanit.variable} ${bebas.variable} h-full antialiased`}>
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
