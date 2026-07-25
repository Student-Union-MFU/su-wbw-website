"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";
import { useLang } from "@/lib/i18n/LanguageProvider";
import FilmGrain from "@/components/FilmGrain";
import { useScene } from "@/components/scene/SceneHost";
import { isSceneLoaded, markSceneLoaded } from "@/components/scene/loadState";
import { BEATS, beatOpacity, clamp01 } from "./trail";

/**
 * หน้า landing = การเดินหนึ่งรอบ
 *
 * ฉาก 3D จริงอยู่ที่ SceneHost (layout) ตัวเดียวตลอดทั้งเว็บ — หน้านี้แค่สั่งให้
 * เข้า "โหมดเดิน" (parkAt undefined) แล้วป้อน progress จาก scroll · ข้อความแต่ละ
 * ช่วง (BEATS) ลอยทับเป็น DOM แล้วเฟดเข้า/ออกตามระยะ
 *
 * ทุกอย่างที่ขยับตาม scroll เขียนผ่าน ref โดยตรง ไม่ผ่าน state —
 * setState ทุกเฟรมจะ re-render ทับ render loop ของ three.js
 */

/** ความสูงของหน้า = ระยะ scroll ทั้งหมด (ยิ่งมาก เดินยิ่งช้า/นุ่ม) */
const SCROLL_VH = 900;

export default function LandingWalk() {
  const { t, lang } = useLang();
  const { progress, setConfig } = useScene();
  const wrapRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const kmRef = useRef<HTMLSpanElement>(null);

  const { active, progress: loadPct } = useProgress();
  const [ready, setReady] = useState(isSceneLoaded);

  // เข้าโหมดเดินตอน mount (parkAt undefined) · ปิดฉากตอน unmount
  useEffect(() => {
    setConfig({ enabled: true, parkAt: undefined, plantStep: undefined });
    return () => setConfig({ enabled: false });
  }, [setConfig]);

  useEffect(() => {
    if (active) return;
    markSceneLoaded();
    const id = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(id);
  }, [active]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    // เก็บ element ของแต่ละ beat (data-beat = ลำดับ) แทนการถือ ref เป็นอาร์เรย์
    // effect นี้ผูกกับ lang ด้วย — สลับภาษาแล้วเก็บ element ใหม่ กันกรณี React
    // สร้าง node ใหม่ (ตอนนี้ key เป็น index แล้วไม่น่าเกิด แต่กันไว้ไม่ให้พังเงียบ ๆ)
    const beatEls: HTMLElement[] = [];
    wrap.querySelectorAll<HTMLElement>("[data-beat]").forEach((el) => {
      beatEls[Number(el.dataset.beat)] = el;
    });

    let raf = 0;
    function update() {
      raf = 0;
      const rect = wrap!.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = clamp01(-rect.top / (total || 1));
      progress.current = p;

      // ข้อความแต่ละช่วง — เฟด + เลื่อนขึ้นเล็กน้อยระหว่างที่แสดงอยู่
      for (let i = 0; i < BEATS.length; i++) {
        const el = beatEls[i];
        if (!el) continue;
        const o = beatOpacity(p, i);
        el.style.opacity = String(o);
        // ปิด pointer ตอนจาง ไม่งั้นปุ่มที่มองไม่เห็นยังกดโดน
        el.style.pointerEvents = o > 0.5 ? "auto" : "none";
        const b = BEATS[i];
        const local = clamp01((p - b.start) / (b.end - b.start));
        el.style.transform = `translateY(${(0.5 - local) * 26}px)`;
      }

      // เลื่อนเลยช่วงเดินไปเท่าไหร่แล้ว (หน่วยพิกเซล) — ใช้จางของที่ลอยทับฉาก
      // ออกก่อนที่ footer จะเลื่อนขึ้นมาถึง · ฉาก 3D ยังอยู่ ให้ footer ทับได้เลย
      const overrun = -rect.top - total;
      const chrome = 1 - clamp01(overrun / (window.innerHeight * 0.45));
      if (chromeRef.current) {
        chromeRef.current.style.opacity = String(chrome);
        chromeRef.current.style.pointerEvents = chrome > 0.5 ? "" : "none";
      }

      if (cueRef.current) cueRef.current.style.opacity = String(1 - clamp01(p / 0.05));
      if (barRef.current) barRef.current.style.transform = `scaleY(${p})`;
      if (kmRef.current) kmRef.current.textContent = (p * 12).toFixed(1);
    }
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [lang]);

  /** ข้อความช่วงกลาง สลับซ้าย/ขวาไปมา ไม่ให้อยู่กลางจอตลอด */
  const sideClass = (i: number) =>
    i % 2 === 0
      ? "items-start text-left sm:pl-[8vw]"
      : "items-end text-right sm:pr-[8vw]";

  return (
    <section ref={wrapRef} style={{ height: `${SCROLL_VH}vh` }} className="relative">
      {/* overlay ตรึงเต็มจอทับฉาก 3D (ฉากอยู่ที่ SceneHost หลัง z-0) · section
          ที่ครอบเป็นแค่ตัวกันความสูงให้ scroll ได้ แต่ยังใช้วัด progress เหมือนเดิม */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* ไล่เฉดเข้มหัว/ท้ายจอ ให้ตัวหนังสืออ่านออกทับฉากสว่าง */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(12,28,20,0.6)_0%,rgba(12,28,20,0)_30%,rgba(12,28,20,0)_55%,rgba(12,28,20,0.7)_100%)]" />

        {/* film grain */}
        <FilmGrain />

        {/* ของที่ลอยทับฉากทั้งหมด — ต้องจางหายตอนเดินจบ ไม่งั้นพอ footer เลื่อน
            ขึ้นมา ปุ่มสมัคร/มาตรวัดระยะจะยังลอยค้างทับ footer อยู่ (เพราะฉาก
            เป็น fixed แล้ว มันไม่เลื่อนตามไปเองเหมือนตอนเป็น sticky) */}
        <div ref={chromeRef}>
        {/* ---- beat 0: หัวเรื่อง ---- */}
        {/* hero เริ่มที่ opacity 1 ตั้งแต่ HTML แรก — เห็นทันทีที่หน้าโหลด
            ไม่ต้องรอ JS คำนวณ scroll ก่อน (beat อื่นเริ่มที่ 0 แล้วค่อยเฟดเข้า) */}
        <div
          data-beat={0}
          style={{ opacity: 1 }}
          className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        >
          <div className="animate-[heroIn_1.2s_cubic-bezier(0.16,1,0.3,1)_both]">
            <p className="text-[10px] font-medium tracking-[0.42em] text-cream/70 sm:text-xs">
              {t.hero.university}
            </p>
            <h1
              className="mt-5 whitespace-normal text-balance text-[clamp(2rem,8.5vw,7rem)] leading-[0.95] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)] sm:whitespace-nowrap"
              style={{ fontFamily: "var(--font-hand)" }}
            >
              {t.hero.title}
            </h1>
            <p
              // Itim รองรับทั้งไทย+ละติน → EN/TH ใช้ฟอนต์เดียวกัน ขนาดตรงกัน
              // (เดิม EN เป็น Patrick Hand ตัวแคบ ดู "บีบ" เล็กกว่าไทยที่เป็น Itim)
              className="mx-auto mt-5 max-w-xl text-base text-cream/85 sm:text-xl"
              style={{ fontFamily: "var(--font-hand-th)" }}
            >
              {t.hero.subtitle}
            </p>
          </div>
        </div>

        {/* ---- beat 1..4: เนื้อหาระหว่างทาง ---- */}
        {t.landing.sections.map((s, i) => (
          <div
            // key ต้องเป็น index ห้ามใช้ s.title เพราะ title คือ "ข้อความที่แปลแล้ว"
            // สลับภาษาทีนึง key เปลี่ยนหมด → React ทิ้ง div เดิมสร้างใหม่
            // แต่ effect ข้างบนเก็บ element ไว้ตั้งแต่ mount (deps []) เลยไปสั่ง opacity
            // ให้ node ที่หลุดจาก DOM ไปแล้ว ส่วน node ใหม่ค้างที่ opacity 0 = ข้อความหาย
            key={i}
            data-beat={i + 1}
            style={{ opacity: 0 }}
            className={`absolute inset-0 flex flex-col justify-center px-7 ${sideClass(i)}`}
          >
            <div className="max-w-md">
              <p className="text-[10px] uppercase tracking-[0.34em] text-gold">{s.eyebrow}</p>
              <h2
                className="mt-4 text-3xl leading-tight text-white drop-shadow-[0_3px_18px_rgba(0,0,0,0.6)] sm:text-5xl"
                style={{ fontFamily: "var(--font-kanit)" }}
              >
                {s.title}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-cream/85 sm:text-base">{s.body}</p>
            </div>
          </div>
        ))}

        {/* ---- beat 5: ปิดท้าย + สมัคร ---- */}
        <div
          data-beat={5}
          style={{ opacity: 0 }}
          className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        >
          <h2
            // Itim รองรับไทย → หัวข้อปิดท้ายภาษาไทยไม่ตกไปฟอนต์ fallback (Patrick Hand
            // ไม่มี glyph ไทย) · EN/TH จึงเป็นลายมือชุดเดียวกัน ขนาดตรงกัน
            className="text-4xl leading-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] sm:text-6xl"
            style={{ fontFamily: "var(--font-hand-th)" }}
          >
            {t.landing.closingHeading}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-cream/80 sm:text-base">
            {t.landing.closingBody}
          </p>
          <Link
            href="/auth/participant/register"
            className="group relative mt-9 inline-flex items-center gap-3 overflow-hidden rounded-full bg-cream px-9 py-4 text-sm font-semibold text-forestdeep transition-transform duration-300 hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cream"
          >
            <span className="absolute inset-0 -translate-x-full bg-gold/45 transition-transform duration-500 group-hover:translate-x-0" />
            <span className="relative">{t.landing.cta}</span>
            <svg
              className="relative transition-transform duration-300 group-hover:translate-x-1"
              width="16"
              height="12"
              viewBox="0 0 16 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M1 6h13M9.5 1.5 14 6l-4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <span className="mt-4 text-[11px] tracking-wide text-cream/55">{t.landing.ctaNote}</span>
        </div>

        {/* ---- มาตรวัดระยะข้างจอ ---- */}
        <div className="pointer-events-none absolute right-5 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-3 sm:flex">
          <span className="text-[9px] uppercase tracking-[0.3em] text-cream/40">km</span>
          <span className="relative block h-40 w-px bg-cream/20">
            <span
              ref={barRef}
              className="absolute inset-0 origin-top bg-gold"
              style={{ transform: "scaleY(0)" }}
            />
          </span>
          <span className="text-[11px] tabular-nums text-cream/70">
            <span ref={kmRef}>0.0</span>
            <span className="text-cream/35"> / 12</span>
          </span>
        </div>

        {/* ---- scroll cue ---- */}
        <div
          ref={cueRef}
          className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-[0.3em] text-cream/45">
            {t.landing.scrollCue}
          </span>
          <span className="h-10 w-px overflow-hidden bg-cream/20">
            <span className="block h-1/2 w-full animate-[cue_1.8s_ease-in-out_infinite] bg-cream/70" />
          </span>
        </div>

        {/* ---- เครดิตโมเดล (CC BY บังคับให้แสดง) ---- */}
        <p className="pointer-events-none absolute bottom-3 left-4 max-w-[60vw] text-[9px] leading-tight text-cream/30">
          {t.landing.credit}
        </p>
        </div>

        {/* ---- หน้า loading ---- */}
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
    </section>
  );
}
