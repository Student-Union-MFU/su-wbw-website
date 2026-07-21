"use client";

import LandingWalk from "@/components/landing/LandingWalk";
import NavBar from "@/components/landing/NavBar";
import SiteFooter from "@/components/register/SiteFooter";

/**
 * หน้า landing — ทั้งหน้าเป็นฉาก 3D ฉากเดียว (เดินรอบดอยตาม scroll)
 * ข้อมูลกิจกรรมโผล่เป็นช่วง ๆ ระหว่างทาง ปลายทางคือปุ่มสมัคร
 *
 * หมายเหตุ: `/` ยัง redirect ไป `/register` เหมือนเดิม (คนสมัคร 2000 คนไม่ต้องคลิกเพิ่ม)
 * ถ้าจะให้หน้านี้เป็นหน้าแรก ให้แก้ app/page.tsx เป็น redirect("/landing")
 */
export default function LandingPage() {
  return (
    // bg-forestdeep = สีพื้นรองระหว่างที่ฉาก 3D (dynamic import, ssr:false)
    // ยังโหลดไม่เสร็จ · โหลดเสร็จแล้วฉากเป็น fixed ทึบเต็มจอทับไปเอง
    <div className="bg-forestdeep">
      <NavBar />
      <LandingWalk />
      {/* footer อยู่ท้ายสุด หลังเดินจบแล้ว — ข้อมูลติดต่อ/ลิขสิทธิ์ */}
      <SiteFooter />
    </div>
  );
}
