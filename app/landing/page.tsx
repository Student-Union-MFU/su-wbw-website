"use client";

import LandingWalk from "@/components/landing/LandingWalk";
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
    //
    // font-display = ตัวกลม ๆ (Darumadrop One + Mitr) ใช้เฉพาะหน้านี้ · หน้าอื่นเป็น
    // ฟอนต์พื้นที่อ่านง่ายกว่า · แถบเมนูอยู่ใน layout ไม่ได้อยู่ในกล่องนี้ จึงไม่โดนด้วย
    // font-synthesis-weight:none = ห้ามเบราว์เซอร์ปลอมตัวหนา เพราะ Darumadrop มี
    // น้ำหนักเดียว (400) พอโดน font-semibold/font-bold แล้วเส้นจะบวมเบลอ
    // (ฝั่งไทยเป็น Mitr ซึ่งมีไฟล์ตัวหนาจริง จึงยังหนาได้ตามปกติ)
    <div className="bg-forestdeep font-display [font-synthesis-weight:none]">
      <LandingWalk />
      {/* footer อยู่ท้ายสุด หลังเดินจบแล้ว — ข้อมูลติดต่อ/ลิขสิทธิ์
          พื้นโปร่งใส ปล่อยให้เห็นฉากป่า 3D (fixed z-0) ทะลุขึ้นมา · ต้อง relative z-10
          เพื่อให้ตัวหนังสืออยู่เหนือฉาก ส่วนความอ่านออกมาจาก text-shadow ใน SiteFooter */}
      <div className="relative z-10">
        <SiteFooter />
      </div>
    </div>
  );
}
