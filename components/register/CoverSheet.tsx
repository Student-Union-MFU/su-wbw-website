"use client";

import { useEffect, useRef, type ReactNode } from "react";

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

// ระยะที่แผ่นดันขึ้นทับ (ต้องเท่ากับ -mt-[44vh] ที่ className ให้ไม่มีช่องว่าง)
const RISE_VH = 0.44;

/**
 * แผ่นเนื้อหา "ดันขึ้นทับ" section ก่อนหน้า ตาม scroll (แบบ milli section cover)
 * flow ถูกดึงขึ้น -44vh + translateY ชดเชยจาก +44vh → 0 ตอน scroll = ดันขึ้นทับ 44vh ไม่มีช่องว่าง
 * ใช้ offsetTop (นิ่ง ไม่โดน transform กวน) กัน feedback loop
 */
export default function CoverSheet({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.transform = "translateY(0)";
      return;
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const rise = vh * RISE_VH;
      const flowTop = el.offsetTop; // ตำแหน่ง flow จริง (นิ่ง)
      const viewTop = flowTop - window.scrollY; // ตำแหน่งบนจอถ้าไม่ transform
      // p: 0 เมื่อหัวแผ่นอยู่ขอบล่างจอ → 1 เมื่อยกถึง ~55% ของจอ
      const p = clamp01((vh - viewTop) / (vh * 0.55));
      el.style.transform = `translateY(${Math.round((1 - p) * rise)}px)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <main ref={ref} id={id} className={className}>
      {children}
    </main>
  );
}
