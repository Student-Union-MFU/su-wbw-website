/**
 * ปลายทางของ API — เว็บกับแอปมือถือใช้ backend (Go) ตัวเดียวกัน
 *
 * ค่าเริ่มต้น (ไม่ตั้ง env): ยิงไปที่ "/api/*" แล้วให้ Next.js proxy ต่อไป backend
 *   — สะดวกตอน dev แต่ทุก request วิ่งผ่าน Node server ของเว็บโดยไม่จำเป็น
 *
 * ตั้ง NEXT_PUBLIC_API_BASE = ปลายทาง backend ตรง ๆ (รวม /wbw ด้วย) เช่น
 *   dev :  http://localhost:8080/wbw
 *   prod:  https://api.your-domain/wbw
 * แล้ว browser จะยิงตรงไป backend ไม่ผ่าน Next (ลดโหลด + เส้นทางเดียวกับแอป)
 * ⚠ ต้องเพิ่ม origin ของเว็บใน CORS_ALLOWED_ORIGINS ฝั่ง backend ด้วย
 *
 * NEXT_PUBLIC_* ถูกฝังตอน build → ตั้งค่าตอน build เหมือน API_UPSTREAM ที่มีอยู่
 */
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

/**
 * รับ path แบบเดิม (ขึ้นต้น "/api/...") แล้วคืน URL ที่จะ fetch จริง
 *   BASE ว่าง  → คืน "/api/..." เท่าเดิม (ผ่าน Next proxy)
 *   BASE ตั้งไว้ → ตัด "/api" ออกแล้วต่อกับ BASE (ยิงตรง backend)
 */
export function apiUrl(path: string): string {
  return BASE ? BASE + path.replace(/^\/api/, "") : path;
}
