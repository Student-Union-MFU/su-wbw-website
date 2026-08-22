/* ============================================================
   ข้อมูลกลางของเว็บสำหรับ SEO — metadata, sitemap, robots และ JSON-LD
   อ่านจากไฟล์นี้ที่เดียว จะได้ไม่ต้องแก้ชื่อ/วันที่/ลิงก์ซ้ำหลายที่
   ============================================================ */

/** URL จริงของเว็บ · ตั้ง NEXT_PUBLIC_SITE_URL ตอน build ถ้าย้ายโดเมน
    (NEXT_PUBLIC_* ถูกฝังตอน `next build` เหมือน NEXT_PUBLIC_API_BASE) */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://walkbeyondthewild.studentunion.social";

export const SITE_NAME_TH = "เดินรอบดอย 2569";
export const SITE_NAME_EN = "Walk Beyond the Wild 2026";

/** คำอธิบายเว็บ · ใส่สองภาษาในสตริงเดียว เพราะ metadata ออกจาก server
    สลับตามภาษาที่ผู้ใช้เลือกไม่ได้ (ไม่มี /en ใน URL) */
export const SITE_DESCRIPTION =
  "กิจกรรมเดินรอบดอย สานต่อรอยปณิธาน ประจำปี 2569 · เดิน 6 กิโลเมตรรอบดอยแม่ฟ้าหลวง " +
  "ผ่านป่าต้นน้ำและสันเขา มี 5 ฐานกิจกรรม พร้อมน้ำดื่มและทีมปฐมพยาบาลตลอดเส้นทาง " +
  "จัดโดยองค์การนักศึกษา มหาวิทยาลัยแม่ฟ้าหลวง · Walk Beyond the Wild 2026, a 6 km " +
  "community walk around Doi Mae Fah Luang, Mae Fah Luang University, Chiang Rai.";

export const KEYWORDS = [
  "เดินรอบดอย",
  "เดินรอบดอย 2569",
  "Walk Beyond the Wild",
  "มหาวิทยาลัยแม่ฟ้าหลวง",
  "มฟล",
  "Mae Fah Luang University",
  "MFU",
  "องค์การนักศึกษา",
  "Student Union MFU",
  "เชียงราย",
  "Chiang Rai",
  "กิจกรรมนักศึกษา",
];

/** องค์การนักศึกษา มฟล. — เจ้าของเว็บและผู้จัดงาน */
export const ORGANIZER = {
  nameTh: "องค์การนักศึกษา มหาวิทยาลัยแม่ฟ้าหลวง",
  nameEn: "Student Union, Mae Fah Luang University",
  url: "https://web.facebook.com/mfu.su",
  /** โปรไฟล์ทางการ — ใช้เป็น sameAs ให้ search engine ผูกตัวตนได้ถูก
      (ลิงก์ชุดเดียวกับที่แสดงในหน้า /contact และ SiteFooter) */
  social: [
    "https://web.facebook.com/mfu.su",
    "https://www.instagram.com/su.mfu",
    "https://www.tiktok.com/@su.mfu",
  ],
};

/** ที่ตั้งงาน — พิกัดคือใจกลางกลุ่มอาคาร มฟล. (ชุดเดียวกับที่ใช้ทำแผนที่ 3D) */
export const VENUE = {
  nameTh: "มหาวิทยาลัยแม่ฟ้าหลวง",
  nameEn: "Mae Fah Luang University",
  street: "333 หมู่ 1 ตำบลท่าสุด",
  locality: "อำเภอเมืองเชียงราย",
  region: "เชียงราย",
  postalCode: "57100",
  country: "TH",
  lat: 20.0445,
  lon: 99.8935,
};

/** วันงาน · มาจากข้อความในเว็บ "ก่อนวันงาน 29 ส.ค. 2569"
    (ยังไม่มีเวลาเริ่มในเนื้อหา จึงใส่แค่วันที่ ไม่ใส่เวลา) */
export const EVENT_DATE = "2026-08-29";

/** หน้าที่ให้ค้นเจอได้ · หน้าที่ต้องล็อกอิน (auth/dashboard/me/staff) ไม่อยู่ในนี้
    และถูกกันไว้ใน app/robots.ts อีกชั้น */
export const PUBLIC_ROUTES = [
  { path: "/landing", priority: 1.0, changeFrequency: "weekly" as const },
  { path: "/register", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/about", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/announcements", priority: 0.7, changeFrequency: "daily" as const },
  { path: "/map", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/contact", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/support", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/privacy", priority: 0.4, changeFrequency: "yearly" as const },
];

/** ภาพการ์ดตอนแชร์ลิงก์ — ไฟล์ app/opengraph-image.png (สร้างด้วย scripts/brand-images.py)
 *
 * ต้องอ้างเองแบบนี้ ไม่ปล่อยให้ Next หยิบจากชื่อไฟล์ให้: พอ segment ไหนประกาศ
 * `openGraph` เอง ฟิลด์ทั้งก้อนจะทับของ segment แม่ (คู่มือหัวข้อ Merging) และภาพ
 * จากชื่อไฟล์ก็หายไปด้วย · คู่มือแนะนำให้แยกออกมาเป็นตัวแปรแล้ว spread ใช้ซ้ำ */
export const OG_IMAGE = {
  images: [
    {
      url: "/opengraph-image.png",
      width: 1200,
      height: 630,
      alt: `${SITE_NAME_TH} · ${SITE_NAME_EN}`,
    },
  ],
};

/** metadata ของหน้าหนึ่ง ๆ — หน้าเว็บทุกหน้าเป็น client component (ใช้ context ภาษา)
    ซึ่ง export metadata ไม่ได้ จึงต้องประกาศใน layout.tsx ของโฟลเดอร์นั้นแทน
    title ที่ใส่ตรงนี้จะถูกเติมท้ายด้วยชื่อเว็บอัตโนมัติตาม template ใน app/layout.tsx */
export function pageMetadata(opts: { title: string; description: string; path: string }) {
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: opts.path },
    openGraph: {
      ...OG_IMAGE,
      type: "website" as const,
      url: opts.path,
      title: `${opts.title} · ${SITE_NAME_TH}`,
      description: opts.description,
      siteName: `${SITE_NAME_TH} · ${SITE_NAME_EN}`,
      locale: "th_TH",
      alternateLocale: "en_US",
    },
  };
}

/** โครงสร้างข้อมูลตาม schema.org — ให้ Google/AI เข้าใจว่าใครจัด งานอะไร ที่ไหน เมื่อไหร่
    ฝังเป็น <script type="application/ld+json"> ใน app/layout.tsx
    ตรวจผลได้ที่ https://search.google.com/test/rich-results */
export function jsonLd() {
  const organization = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: ORGANIZER.nameTh,
    alternateName: ORGANIZER.nameEn,
    url: SITE_URL,
    logo: `${SITE_URL}/schools/LOGO-02.png`,
    sameAs: ORGANIZER.social,
    parentOrganization: {
      "@type": "CollegeOrUniversity",
      name: VENUE.nameTh,
      alternateName: VENUE.nameEn,
      url: "https://www.mfu.ac.th/",
    },
  };

  const website = {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: `${SITE_NAME_TH} · ${SITE_NAME_EN}`,
    description: SITE_DESCRIPTION,
    inLanguage: ["th-TH", "en-US"],
    publisher: { "@id": `${SITE_URL}/#organization` },
  };

  const place = {
    "@type": "Place",
    name: `${VENUE.nameTh} · ${VENUE.nameEn}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: VENUE.street,
      addressLocality: VENUE.locality,
      addressRegion: VENUE.region,
      postalCode: VENUE.postalCode,
      addressCountry: VENUE.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: VENUE.lat, longitude: VENUE.lon },
  };

  const event = {
    "@type": "SportsEvent",
    "@id": `${SITE_URL}/#event`,
    name: `${SITE_NAME_TH} · ${SITE_NAME_EN}`,
    description: SITE_DESCRIPTION,
    startDate: EVENT_DATE,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: place,
    organizer: { "@id": `${SITE_URL}/#organization` },
    image: `${SITE_URL}/opengraph-image.png`,
    url: `${SITE_URL}/landing`,
  };

  return { "@context": "https://schema.org", "@graph": [organization, website, event] };
}
