import type { Metadata } from "next";
import { Anuphan, Darumadrop_One, Mitr } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import SceneHost from "@/components/scene/SceneHost";
import SiteChrome from "@/components/SiteChrome";
import "./globals.css";

/* ====== ฟอนต์: ใช้ชุดเดียวกันทั้งเนื้อความและหัวเรื่อง (กลม ๆ อ้วน ๆ) ======
   Darumadrop One ไม่มี glyph ไทย (subset มีแค่ latin/latin-ext) — ปล่อยเดี่ยว ๆ
   ข้อความไทยทั้งเว็บจะตกไปใช้ฟอนต์ระบบซึ่งไม่เข้ากันเลย · จึงวางเป็น "สแต็ก":
   ละติน/ตัวเลข → Darumadrop One · ไทย → Mitr (กลมหนาใกล้เคียงกัน)
   เบราว์เซอร์เลือกให้เองทีละตัวอักษร ไม่ต้องสลับตามภาษาที่ผู้ใช้เลือก */

// ตัวละติน/ตัวเลข · adjustFontFallback: false — ไม่งั้น next/font จะแทรกฟอนต์ระบบ
// (metric-adjusted) ต่อท้ายชื่อฟอนต์ในตัวแปรนี้ ซึ่งอาจไปคว้าตัวไทยก่อนถึง Mitr
const daruma = Darumadrop_One({
  variable: "--font-daruma",
  subsets: ["latin"],
  weight: "400",
  adjustFontFallback: false,
});

// ตัวไทย · โหลดหลายน้ำหนักไว้ให้ class อย่าง font-semibold/font-bold มีของจริงใช้
// (ฝั่งละติน Darumadrop มีน้ำหนักเดียว ตัวหนาจะเป็นแบบที่เบราว์เซอร์ปลอมให้)
const mitr = Mitr({
  variable: "--font-mitr",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

// Anuphan — เฉพาะ "แถบบน" (แถบเมนูของเว็บ + แถบหัวแผงผู้ดูแล) ผ่าน utility `font-ui`
// ตัวอักษรในแถบพวกนี้เล็ก (11–14px) และเป็นของที่ต้องกวาดตาอ่านเร็ว ๆ ฟอนต์
// ตัวกลม ๆ อย่าง Darumadrop/Mitr จะเบลอในขนาดนั้น · Anuphan รองรับไทย+ละตินในตัวเดียว
const anuphan = Anuphan({
  variable: "--font-anuphan",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
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
    <html
      lang="th"
      className={`${daruma.variable} ${mitr.variable} ${anuphan.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          {/* Canvas 3D ตัวเดียวของทั้งเว็บ อยู่ที่นี่ ไม่ unmount ตอนเปลี่ยนหน้า
              (กันจอเขียวแวบ + ประหยัดหน่วยความจำ) · หน้าต่าง ๆ สั่งฉากผ่าน context */}
          <SceneHost>
            {/* แถบเมนู (รวมปุ่มเข้าสู่ระบบ/โปรไฟล์) ตัวเดียวเช่นกัน — อยู่นอก {children}
                จึงไม่ถูก mount ใหม่ตอนเปลี่ยนหน้า */}
            <SiteChrome />
            {children}
          </SceneHost>
        </LanguageProvider>
      </body>
    </html>
  );
}
