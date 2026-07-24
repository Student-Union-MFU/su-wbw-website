import type { NextConfig } from "next";

// proxy /api/* ไป backend Go (su-server) — route WBW อยู่ใต้ prefix /wbw
// rewrite ตัด /api ออก แล้วต่อท้าย upstream: /api/admin/schools → <upstream>/admin/schools
//
// 📌 ตอนนี้ proxy นี้เป็น "ทางสำรอง" แล้ว — ถ้าตั้ง NEXT_PUBLIC_API_BASE (ดู lib/apiBase.ts)
//    browser จะยิงตรงไป backend ไม่ผ่าน proxy นี้เลย · ปล่อย rewrite ไว้ให้ dev ที่ไม่ตั้ง
//    env ยังใช้ได้ และเป็น fallback
//
// ⚠ ค่านี้ถูก "ฝัง" ตอน next build (routes-manifest.json) ไม่ได้อ่านตอนรันจริง
//    - next dev: อ่านไฟล์นี้ตอน start → เปลี่ยน env แล้ว restart พอ
//    - next build/start + standalone: ต้องตั้ง API_UPSTREAM ตอน BUILD ไม่ใช่ตอน start
//      (ตั้งตอน start จะไม่มีผล — ยังยิงไป upstream ที่ฝังไว้ตอน build)
const API_UPSTREAM = process.env.API_UPSTREAM ?? "http://localhost:8080/wbw";

const nextConfig: NextConfig = {
  output: "standalone", // build เล็ก รันด้วย node server.js ตอน deploy
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_UPSTREAM}/:path*`,
      },
    ];
  },
};

export default nextConfig;
