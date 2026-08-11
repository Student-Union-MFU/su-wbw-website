import type { Metadata } from "next";
import { Anuphan, Darumadrop_One, Mitr } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import {
  jsonLd,
  KEYWORDS,
  OG_IMAGE,
  ORGANIZER,
  SITE_DESCRIPTION,
  SITE_NAME_EN,
  SITE_NAME_TH,
  SITE_URL,
} from "@/lib/seo";
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
   จึงใส่ทั้งสองภาษาไว้ ส่วน title ของแท็บ LanguageProvider จะอัปเดตให้หลัง mount

   ไอคอน/ภาพแชร์ไม่ได้ประกาศตรงนี้ — Next อ่านจากชื่อไฟล์ใน app/ ให้เอง:
   favicon.ico · icon.png · apple-icon.png · opengraph-image.png
   (สร้างจากโลโก้ด้วย scripts/brand-images.py) */
export const metadata: Metadata = {
  // ต้องมี ไม่งั้นฟิลด์ที่ใช้พาธสัมพัทธ์ (canonical, og:image) พังตอน build
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME_TH} · ${SITE_NAME_EN}`,
    // หน้าลูกใส่แค่ชื่อหน้า ส่วนท้ายเติมให้อัตโนมัติ
    template: `%s · ${SITE_NAME_TH}`,
  },
  description: SITE_DESCRIPTION,
  keywords: KEYWORDS,
  applicationName: SITE_NAME_TH,
  authors: [{ name: ORGANIZER.nameTh, url: ORGANIZER.url }],
  creator: ORGANIZER.nameTh,
  publisher: ORGANIZER.nameTh,
  category: "events",
  alternates: { canonical: "/" },
  // เบอร์โทร/ที่อยู่ในหน้า contact ไม่ต้องให้ iOS ทำเป็นลิงก์สีฟ้าเอง
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    ...OG_IMAGE,
    type: "website",
    siteName: `${SITE_NAME_TH} · ${SITE_NAME_EN}`,
    title: `${SITE_NAME_TH} · ${SITE_NAME_EN}`,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "th_TH",
    alternateLocale: "en_US",
  },
  // ไม่ต้องชี้ภาพเอง — X ใช้ og:image เมื่อไม่มี twitter:image
  twitter: { card: "summary_large_image" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
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
        {/* ข้อมูลผู้จัด/งาน/เว็บ แบบ schema.org — ให้ search engine กับ AI อ่านได้ตรง ๆ
            แทนที่จะต้องเดาจากเนื้อหาในหน้า · แก้ข้อมูลได้ที่ lib/seo.ts ที่เดียว
            .replace('<') ตามคำแนะนำในคู่มือ Next (กัน string หลุดออกจาก <script>) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd()).replace(/</g, "\\u003c"),
          }}
        />
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
