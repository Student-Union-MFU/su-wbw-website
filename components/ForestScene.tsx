"use client";

import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";
import FilmGrain from "@/components/FilmGrain";
import { lerp } from "@/components/landing/trail";
import { PARK_P } from "@/components/scene/config";
import { useScene } from "@/components/scene/SceneHost";
import { isSceneLoaded, markSceneLoaded } from "@/components/scene/loadState";
import { useT } from "@/lib/i18n/LanguageProvider";

/**
 * ฉากป่าแบบ "ยืนอยู่กับที่" สำหรับหน้าที่มีฟอร์มลอยทับ (สมัคร/เข้าสู่ระบบ/โปรไฟล์/
 * ประกาศ/เกี่ยวกับ/ติดต่อ)
 *
 * ไม่มี <Canvas> ของตัวเองแล้ว — Canvas จริงอยู่ที่ SceneHost ใน layout ตัวเดียว
 * ตลอดทั้งเว็บ · คอมโพเนนต์นี้แค่ (1) สั่งให้ฉากยืนอยู่กับที่ + คุมช่วงเวลาของวัน/
 * ต้นไม้ผ่าน context และ (2) วาด overlay (scrim/เกรน/เครดิต/หน้าโหลด) ทับฉาก
 * ผลคือเปลี่ยนหน้าไม่ต้องสร้าง WebGL ใหม่ = ไม่มีจอเขียวแวบ
 */
export default function ForestScene({
  day,
  plantStep,
  focus = "right",
}: {
  /** ช่วงเวลาของวัน 0..1 — เปลี่ยนค่าแล้วแสงจะไล่ไปหาค่าใหม่แบบนุ่ม ๆ */
  day: number;
  /** ระยะการเติบโตของต้นไม้ · ไม่ส่ง = ไม่มีต้นไม้ในฉาก */
  plantStep?: number;
  /** ฟอร์มลอยทับชิดขวา (สมัคร) หรือกลางจอ (อื่น ๆ) — คุมทิศ scrim */
  focus?: "right" | "center";
}) {
  const t = useT();
  const { progress, reduced, setConfig } = useScene();
  const { active, progress: loadPct } = useProgress();
  // โหลดเสร็จแล้ว (จากหน้าก่อน) → ไม่ต้องโชว์หน้าโหลดอีกตอนเปลี่ยนหน้า
  const [ready, setReady] = useState(isSceneLoaded);

  // เปิดฉากโหมดยืนตอน mount · ปิดตอน unmount (หน้าถัดไปจะเปิดของตัวเอง)
  useEffect(() => {
    setConfig({ enabled: true, parkAt: PARK_P });
    return () => setConfig({ enabled: false });
  }, [setConfig]);

  // ต้นไม้ตาม step (หน้าสมัคร) — อัปเดตแยก ไม่ให้ปิด/เปิดฉากตอน step เปลี่ยน
  useEffect(() => {
    setConfig({ plantStep });
  }, [plantStep, setConfig]);

  // หน้าโหลด: โชว์จนโมเดลโหลดเสร็จ แล้วจำไว้ว่าโหลดแล้ว (ครั้งเดียวตลอดทั้งเว็บ)
  useEffect(() => {
    if (active) return;
    markSceneLoaded();
    const id = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(id);
  }, [active]);

  // ไล่แสงไปหาเวลาของวันใหม่แบบนุ่ม ๆ แล้วหยุด rAF เอง · เขียนลง progress ที่แชร์กัน
  useEffect(() => {
    const to = day;
    if (reduced) {
      progress.current = to;
      return;
    }
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      progress.current = lerp(progress.current, to, Math.min(1, dt * 1.3));
      if (Math.abs(progress.current - to) > 0.0008) {
        raf = requestAnimationFrame(tick);
      } else {
        progress.current = to;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [day, reduced, progress]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      {/* ไล่เฉดเข้มหัว/ท้ายจอ ให้ฟอร์มที่ลอยทับอ่านออกทุกช่วงเวลา */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,22,16,0.72)_0%,rgba(10,22,16,0.15)_22%,rgba(10,22,16,0.2)_62%,rgba(10,22,16,0.75)_100%)]" />
      {/* scrim ตรงที่ฟอร์มวางอยู่ · จอเล็กฟอร์มกินเต็มความกว้างอยู่แล้ว เลยเข้มทั้งจอ */}
      {focus === "right" ? (
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,22,16,0.45),rgba(10,22,16,0.45))] lg:bg-[linear-gradient(to_right,rgba(10,22,16,0)_0%,rgba(10,22,16,0)_38%,rgba(10,22,16,0.45)_62%,rgba(10,22,16,0.6)_100%)]" />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,22,16,0.45),rgba(10,22,16,0.45))] lg:bg-[radial-gradient(ellipse_at_center,rgba(10,22,16,0.6)_0%,rgba(10,22,16,0.4)_45%,rgba(10,22,16,0.15)_75%)]" />
      )}

      <FilmGrain />

      {/* เครดิตโมเดล — CC BY บังคับให้แสดงบนหน้าที่เอาโมเดลไปใช้ */}
      <p className="absolute bottom-3 left-4 max-w-[60vw] text-[9px] leading-tight text-cream/40">
        {t.landing.credit}
      </p>

      {/* หน้า loading — เห็นเฉพาะตอนโหลดฉากครั้งแรกของทั้งเว็บ */}
      <div
        className={`absolute inset-0 flex items-center justify-center bg-forestdeep transition-opacity duration-700 ${
          ready ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <span className="text-[10px] uppercase tracking-[0.4em] text-cream/50">
            {t.hero.university}
          </span>
          <span className="h-px w-40 overflow-hidden bg-cream/15">
            <span
              className="block h-full bg-gold transition-[width] duration-300"
              style={{ width: `${loadPct}%` }}
            />
          </span>
        </div>
      </div>
    </div>
  );
}
