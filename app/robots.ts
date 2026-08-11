import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * robots.txt — Next สร้างไฟล์นี้ให้ตอน build จากค่าที่ return
 *
 * หน้าที่ต้องล็อกอิน (สมัคร/แผงผู้ดูแล/โปรไฟล์) ไม่ควรอยู่ในผลค้นหา:
 * เนื้อหาเป็นของเฉพาะบุคคล และ crawler เข้าไปก็เห็นแค่หน้าเปล่ากับปุ่มล็อกอิน
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/auth/", "/dashboard", "/me", "/participant/", "/staff/", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
