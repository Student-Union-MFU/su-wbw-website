"use client";

import { useEffect, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";
import TrailScene, { type Clearing } from "@/components/landing/TrailScene";
import GrowingPlant from "./register/GrowingPlant";
import FilmGrain from "@/components/FilmGrain";
import { curve, lerp, zAt } from "@/components/landing/trail";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useT } from "@/lib/i18n/LanguageProvider";

/**
 * ฉากป่าเป็นพื้นหลังแบบ "ยืนอยู่กับที่" — ใช้ฉาก 3D เดียวกับหน้า landing
 * แต่กล้องไม่เดินไปไหน ใช้เป็นฉากหลังของหน้าที่มีฟอร์มลอยทับ
 *
 * ใช้อยู่สองที่:
 *   · หน้าสมัคร — ส่ง plantStep มาด้วย เปลี่ยน step แล้วแสงไล่ไปข้างหน้าหนึ่งช่วง
 *     และต้นไม้โตขึ้นหนึ่งระยะ
 *   · หน้าเข้าสู่ระบบผู้ดูแล — ไม่ส่ง plantStep (ไม่มีต้นไม้) แสงนิ่งอยู่เวลาเดียว
 */

/** จุดที่ยืนบนเส้นทาง */
const PARK_P = 0.28;
const CAM_Z = zAt(PARK_P);

/**
 * ต้นไม้ประจำผู้สมัคร — ข้างหน้าเยื้องซ้าย พ้นขอบทางเดินออกไปนิดเดียว
 *
 * ระยะ 6 หน่วยคือระยะที่ใกล้พอให้ต้นระยะแรกยังเห็นชัด:
 * ที่ fov 55° ความสูงที่มองเห็นตรงระยะนี้ ≈ 6.2 หน่วย ต้นระยะแรกสูง 0.7
 * จึงกินราว 11% ของความสูงจอ (ตอนอยู่ที่ 8.5 หน่วยเหลือแค่ ~4% = แทบมองไม่เห็น)
 *
 * เยื้องซ้าย 2.9: ความกว้างทางเดินจริงตรง z นี้คือ 2.10 ไม่ใช่ TRAIL_HALF (3.2)
 * เพราะ TrailPath แกว่งความกว้างตาม z — ต้นไม้เลยขยับเข้ามาทางขวาได้อีกโดยยัง
 * ไม่ไปยืนบนทาง · ตำแหน่งบนจอขยับจาก 16% มาเป็น ~24% จากขอบซ้าย
 */
const PLANT_Z = CAM_Z - 6.0;
const PLANT_X = curve(PLANT_Z) - 2.9;
/** ถางที่รอบต้นไม้ ไม่ให้ต้นไม้ในผังฉากงอกทับ */
const CLEARING: Clearing = { x: PLANT_X, z: PLANT_Z, r: 3.2 };

export default function ForestScene({
  day,
  plantStep,
  focus = "right",
}: {
  /** ช่วงเวลาของวัน 0..1 — เปลี่ยนค่าแล้วแสงจะไล่ไปหาค่าใหม่แบบนุ่ม ๆ */
  day: number;
  /** ระยะการเติบโตของต้นไม้ · ไม่ส่ง = ไม่มีต้นไม้ในฉาก */
  plantStep?: number;
  /** ฟอร์มที่ลอยทับอยู่ชิดขวา (หน้าสมัคร) หรืออยู่กลางจอ (เข้าสู่ระบบ) — คุมทิศของ scrim */
  focus?: "right" | "center";
}) {
  const t = useT();
  const reduced = useReducedMotion();
  const progress = useRef(day);

  const { active, progress: loadPct } = useProgress();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (active) return;
    const id = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(id);
  }, [active]);

  // ไล่แสงไปหาเวลาใหม่แบบนุ่ม ๆ แล้วหยุด rAF เอง (ไม่วนทิ้งไว้เปล่า ๆ)
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
  }, [day, reduced]);

  return (
    <div className="fixed inset-0 z-0 bg-forestdeep" aria-hidden>
      <TrailScene
        progress={progress}
        reduced={reduced}
        parkAt={PARK_P}
        /* ถางที่เฉพาะตอนมีต้นไม้จะปลูก — ไม่งั้นเหลือรูโล่งกลางป่าโดยไม่มีอะไรอยู่ */
        clearing={plantStep === undefined ? undefined : CLEARING}
      >
        {plantStep === undefined ? null : (
          <GrowingPlant step={plantStep} x={PLANT_X} z={PLANT_Z} reduced={reduced} />
        )}
      </TrailScene>

      {/* ไล่เฉดเข้มหัว/ท้ายจอ + ฝั่งขวา ให้ฟอร์มที่ลอยทับอ่านออกทุกช่วงเวลา */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,22,16,0.72)_0%,rgba(10,22,16,0.15)_22%,rgba(10,22,16,0.2)_62%,rgba(10,22,16,0.75)_100%)]" />
      {/* scrim ตรงที่ฟอร์มวางอยู่ · จอเล็กฟอร์มกินเต็มความกว้างอยู่แล้ว เลยเข้มทั้งจอ */}
      {focus === "right" ? (
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,22,16,0.45),rgba(10,22,16,0.45))] lg:bg-[linear-gradient(to_right,rgba(10,22,16,0)_0%,rgba(10,22,16,0)_38%,rgba(10,22,16,0.45)_62%,rgba(10,22,16,0.6)_100%)]" />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,22,16,0.45),rgba(10,22,16,0.45))] lg:bg-[radial-gradient(ellipse_at_center,rgba(10,22,16,0.6)_0%,rgba(10,22,16,0.4)_45%,rgba(10,22,16,0.15)_75%)]" />
      )}

      <FilmGrain />

      {/* เครดิตโมเดล — CC BY บังคับให้แสดงบนหน้าที่เอาโมเดลไปใช้ (เหมือนหน้า landing) */}
      <p className="pointer-events-none absolute bottom-3 left-4 max-w-[60vw] text-[9px] leading-tight text-cream/40">
        {t.landing.credit}
      </p>

      {/* หน้า loading — ฉากหนักกว่าหน้าอื่น ไม่ให้เห็นฉากโผล่ทีละชิ้น */}
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-forestdeep transition-opacity duration-700 ${
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
