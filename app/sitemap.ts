import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, SITE_URL } from "@/lib/seo";

/**
 * sitemap.xml — รายชื่อหน้าที่เปิดให้ค้นเจอ (ดู PUBLIC_ROUTES ใน lib/seo.ts)
 *
 * lastModified ใช้เวลาตอน build ไม่ใช่ตอนที่ผู้ใช้ขอหน้า — ไฟล์นี้จึงยัง prerender ได้
 * และค่าที่ได้ก็ตรงความจริงกว่า (เนื้อหาเปลี่ยนตอน deploy ไม่ใช่ตอนมีคนเปิด)
 */
const BUILT_AT = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: BUILT_AT,
    changeFrequency,
    priority,
  }));
}
