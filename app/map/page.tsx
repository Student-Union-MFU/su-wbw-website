"use client";

import dynamic from "next/dynamic";
import { useProgress } from "@react-three/drei";
import { headingFont, useLang } from "@/lib/i18n/LanguageProvider";
// ไฟล์ข้อมูลล้วน ไม่ได้ลาก three.js เข้ามา — import ตรงนี้ได้ไม่กระทบ bundle ของหน้า
import { CAMPUS_ROUTE_KM } from "@/components/map/campusRoute";

/**
 * หน้าแผนที่ — โมเดล 3D ของพื้นที่รอบมหาวิทยาลัย (ส่งออกจาก maps3d.io)
 *
 * ฉากอยู่ใน MapScene ซึ่งลาก three.js เข้ามา จึงโหลดแบบ dynamic(ssr:false)
 * เหมือน PersistentScene — ไม่งั้น build ฝั่ง server จะพังเพราะไม่มี WebGL
 *
 * หน้านี้ไม่เรียก <ForestScene /> เหมือนหน้าอื่น ๆ เพราะมีฉากของตัวเองแล้ว
 * (ฉากป่าใน SceneHost ถูกปิดไว้ตั้งแต่หน้าก่อนหน้า unmount)
 */

const MapScene = dynamic(() => import("@/components/map/MapScene"), { ssr: false });

export default function MapPage() {
  const { t, lang } = useLang();
  // ตัวโหลดของ three (DefaultLoadingManager) — ไฟล์ ~10 MB โหลดไม่ทันใจแน่
  // ถ้าไม่บอกอะไรเลย ผู้ใช้จะเห็นจอเขียวเปล่า ๆ แล้วนึกว่าหน้าเสีย
  const { active, progress } = useProgress();

  return (
    <main className="relative h-screen w-full overflow-hidden bg-forestdeep">
      <div className="absolute inset-0 z-0">
        <MapScene />
      </div>

      {/* หัวเรื่องลอยทับฉาก · pointer-events-none ไม่งั้นบังการลากหมุนแผนที่ */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-28 text-center sm:pt-32">
        <p className="text-[10px] uppercase tracking-[0.42em] text-goldsoft sm:text-xs">
          {t.map.eyebrow}
        </p>
        <h1
          className="mt-3 text-[clamp(2rem,5vw,3.2rem)] leading-[1.05] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
          style={headingFont(lang, 1.25)}
        >
          {t.map.heading}
        </h1>
        <p className="mt-2 text-sm text-cream/75 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
          {t.map.hint}
        </p>
      </header>

      {/* คำอธิบายเส้นสีเขียว — ไม่งั้นผู้ใช้ไม่รู้ว่าเส้นนั้นคืออะไร */}
      <div className="pointer-events-none absolute bottom-12 left-1/2 z-10 -translate-x-1/2 rounded-full border border-cream/15 bg-ink/70 px-4 py-2 backdrop-blur-md">
        <span className="flex items-center gap-2.5 whitespace-nowrap text-xs text-cream/85 sm:text-sm">
          <span className="h-1 w-6 flex-none rounded-full bg-[#ffb02e]" />
          {t.map.route}
          <span className="text-cream/55">
            {CAMPUS_ROUTE_KM} {lang === "th" ? "กม." : "km"}
          </span>
        </span>
      </div>

      {active && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-forestdeep/80 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-sm text-cream/85">{t.map.loading}</p>
            <div className="mx-auto mt-3 h-1 w-40 overflow-hidden rounded-full bg-cream/15">
              <div
                className="h-full rounded-full bg-gold transition-[width] duration-200"
                style={{ width: `${Math.round(progress)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* เครดิตภาพ — เงื่อนไขการใช้งานของ maps3d.io บังคับไว้ ห้ามเอาออก */}
      <p className="absolute bottom-3 left-0 right-0 z-10 px-4 text-center text-[10px] leading-relaxed text-cream/60 sm:text-[11px]">
        {t.map.imagery}{" "}
        <a
          href="https://satlas.allen.ai/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-cream/30 underline-offset-2 hover:text-cream"
        >
          Satlas · Allen Institute for AI
        </a>
        {" · "}
        {t.map.topo} ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-cream/30 underline-offset-2 hover:text-cream"
        >
          OpenStreetMap
        </a>
      </p>
    </main>
  );
}
