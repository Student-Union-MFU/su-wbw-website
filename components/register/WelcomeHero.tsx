"use client";

import { useEffect, useRef } from "react";
import DustParticles from "./DustParticles";
import { useLang } from "@/lib/i18n/LanguageProvider";

/**
 * Section 1 — หน้าต้อนรับ scroll-driven "image sequence"
 * ตอนนี้ render ฉากภูเขา/พระอาทิตย์ขึ้นแบบ procedural ตาม scroll progress (placeholder)
 * กลไกเดียวกับ image sequence จริง — ทีหลังสลับ renderFrame() เป็น ctx.drawImage(frames[i]) ได้เลย
 */

// palette (ตรงกับ globals.css)
const FORESTDEEP = "#1b4332";

const SCROLL_VH = 260; // ความยาว scroll ของ section (vh) — ยิ่งมาก scrub ยิ่งช้า/นุ่ม

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function clamp01(x: number) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

// ridge line ภูเขา 1 ชั้น (sine ผสม) — คืน path ปิดถึงก้นจอ
// ต้นไม้ริมทาง 2 แถวต่อข้าง (ใกล้/ไกล) — ป่าแน่น · วางล่วงหน้าให้ไหลต่อเนื่อง
const TREES = Array.from({ length: 60 }, (_, i) => {
  const side = i % 2 === 0 ? -1 : 1;
  const back = i % 4 >= 2; // แถวหลัง (ไกลออกไปด้านข้าง)
  return {
    phase: (i * 0.1367) % 1, // กระจายทั่วเส้นทาง
    side,
    lateral: (back ? 5.6 : 2.9) + ((i * 7) % 10) / 8,
    height: (back ? 4.6 : 3.3) + ((i * 29) % 12) / 5,
    tone: ((i * 53) % 100) / 100, // แปรโทนเขียว
  };
});

const TRAVEL_LOOPS = 1.35; // จำนวนรอบไหลตลอด scroll (ยิ่งมาก = ความเร็วถอยหลังมาก)
const FOG: [number, number, number] = [216, 218, 200]; // สีหมอกอุ่นจางสำหรับ atmospheric perspective

function mix(a: [number, number, number], b: [number, number, number], t: number) {
  return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
}

// วาดต้นไม้ 1 ต้น — พุ่มหลายชั้น 2 โทน + เงาโคน · จางเป็นหมอกตามระยะ (f: 0 ใกล้ .. 1 ไกล)
function drawTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  topY: number,
  scale: number,
  f: number,
  tone: number,
  alpha: number,
) {
  const H = groundY - topY;
  if (H <= 1) return;
  const fog = clamp01((f - 0.08) / 0.92);
  const cw = scale * 0.82;

  // เงาโคนต้น (grounding)
  ctx.globalAlpha = alpha * 0.28;
  ctx.fillStyle = "rgb(8,20,14)";
  ctx.beginPath();
  ctx.ellipse(x, groundY, Math.max(2, scale * 0.6), Math.max(1, scale * 0.16), 0, 0, Math.PI * 2);
  ctx.fill();

  // ลำต้น (เรียว) — น้ำตาลจางเป็นหมอกตามระยะ
  const trunkW = Math.max(1, scale * 0.09);
  const trunkTop = groundY - H * 0.44;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = mix([74, 54, 40], FOG, fog * 0.85);
  ctx.beginPath();
  ctx.moveTo(x - trunkW, groundY);
  ctx.lineTo(x - trunkW * 0.5, trunkTop);
  ctx.lineTo(x + trunkW * 0.5, trunkTop);
  ctx.lineTo(x + trunkW, groundY);
  ctx.closePath();
  ctx.fill();

  // พุ่มเขียว 2 โทน (base เข้ม + highlight ซ้ายบน = ทิศแสง)
  const dark = mix([18 + tone * 14, 50 + tone * 16, 34 + tone * 10], FOG, fog * 0.9);
  const light = mix([70, 122, 82], FOG, fog * 0.9);
  const cyTop = topY;
  const cyBot = topY + H * 0.74;
  const blob = (dx: number, dy: number, r: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x + dx * cw, lerp(cyTop, cyBot, dy), r * cw, r * cw * 1.08, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  ctx.globalAlpha = alpha;
  blob(0, 0.24, 0.5, dark);
  blob(-0.34, 0.5, 0.44, dark);
  blob(0.34, 0.5, 0.44, dark);
  blob(-0.14, 0.74, 0.47, dark);
  blob(0.16, 0.74, 0.45, dark);
  ctx.globalAlpha = alpha * 0.8;
  blob(-0.18, 0.28, 0.33, light);
  blob(-0.02, 0.14, 0.26, light);
  ctx.globalAlpha = 1;
}

/**
 * วาด 1 เฟรมตาม progress p — มุมกล้อง "ถอยหลังผ่านเส้นทาง"
 * เส้นทาง+ต้นไม้ไหลเข้าหา horizon เมื่อ p เพิ่ม (กล้องถอยหลัง เห็นทางที่ผ่านมาไกลออกไป)
 * โครงเดียวกับ image sequence — ทีหลังสลับเป็น ctx.drawImage(frames[i]) ได้
 */
function renderFrame(ctx: CanvasRenderingContext2D, w: number, h: number, p: number) {
  const horizonY = h * 0.42;
  const cx = w / 2;
  const focal = h * 0.9; // ความชันเพอร์สเปกทีฟ
  const camH = 2.2; // ความสูงกล้อง (เมตร)
  const zNear = 3.5;
  const zFar = 95;
  const trailHalf = 1.8; // ครึ่งความกว้างทาง (เมตร)
  const curve = (z: number) => Math.sin(z * 0.045 + 0.6) * 2.4; // ทางคดเคี้ยว (เมตร)

  // project จุด 3D (z ไปข้างหน้า, xLat ซ้าย/ขวา, yUp สูงจากพื้น) → หน้าจอ
  const proj = (z: number, xLat: number, yUp = 0) => {
    const s = focal / z;
    return { sx: cx + (xLat + curve(z)) * s, sy: horizonY + (camH - yUp) * s, s };
  };

  // 1. ท้องฟ้า (ก่อนรุ่ง → รุ่งทอง ตาม p)
  const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
  sky.addColorStop(0, FORESTDEEP);
  sky.addColorStop(1, p > 0.5 ? "#e9c46a" : "#5f8168");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizonY + 1);

  // แสงอุ่นที่เส้นขอบฟ้า
  const glow = ctx.createRadialGradient(cx, horizonY, 0, cx, horizonY, h * 0.55);
  glow.addColorStop(0, `rgba(233,196,106,${lerp(0.15, 0.5, p)})`);
  glow.addColorStop(1, "rgba(233,196,106,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, horizonY);

  // 2. พื้นป่า
  const ground = ctx.createLinearGradient(0, horizonY, 0, h);
  ground.addColorStop(0, "#3a5a44");
  ground.addColorStop(1, FORESTDEEP);
  ctx.fillStyle = ground;
  ctx.fillRect(0, horizonY, w, h - horizonY);

  // 2b. แนวป่าไกลที่เส้นขอบฟ้า (silhouette จางเป็นหมอก = ป่าแน่น มีระยะ)
  ctx.fillStyle = mix([30, 60, 44], FOG, 0.66);
  ctx.beginPath();
  ctx.moveTo(0, horizonY + 3);
  for (let x = 0; x <= w; x += 14) {
    const jag = Math.sin(x * 0.03) * h * 0.014 + Math.sin(x * 0.11 + 1.3) * h * 0.006;
    ctx.lineTo(x, horizonY - h * 0.025 + jag);
  }
  ctx.lineTo(w, horizonY + 3);
  ctx.closePath();
  ctx.fill();

  // 3. เส้นทางดิน (polygon zFar..zNear)
  const STEPS = 26;
  ctx.beginPath();
  for (let i = 0; i <= STEPS; i++) {
    const pt = proj(lerp(zFar, zNear, i / STEPS), -trailHalf);
    i === 0 ? ctx.moveTo(pt.sx, pt.sy) : ctx.lineTo(pt.sx, pt.sy);
  }
  for (let i = 0; i <= STEPS; i++) {
    const pt = proj(lerp(zNear, zFar, i / STEPS), trailHalf);
    ctx.lineTo(pt.sx, pt.sy);
  }
  ctx.closePath();
  const trail = ctx.createLinearGradient(0, horizonY, 0, h);
  trail.addColorStop(0, "#6b5636");
  trail.addColorStop(1, "#b79268");
  ctx.fillStyle = trail;
  ctx.fill();

  // 4. เส้นประกลางทาง (ไหลเข้าหา horizon = รู้สึกถอยหลัง)
  const STRIPES = 14;
  for (let k = 0; k < STRIPES; k++) {
    const f = (k / STRIPES + p * TRAVEL_LOOPS) % 1; // 0(ใกล้)..1(ไกล)
    const a = proj(lerp(zNear, zFar, f), 0);
    const len = Math.max(1, a.s * 0.55);
    const wd = Math.max(0.6, a.s * 0.13);
    const alpha = clamp01(f / 0.05) * (1 - clamp01((f - 0.82) / 0.18));
    ctx.fillStyle = `rgba(250,247,240,${0.45 * alpha})`;
    ctx.fillRect(a.sx - wd / 2, a.sy - len, wd, len);
  }

  // 5. ต้นไม้ริมทาง (painter's: ไกล→ใกล้) — พุ่มหลายชั้น + เงา + หมอกตามระยะ
  const drawn = TREES.map((t) => {
    const f = (t.phase + p * TRAVEL_LOOPS) % 1;
    return { t, f, z: lerp(zNear, zFar, f) };
  }).sort((a, b) => b.z - a.z);
  for (const { t, f, z } of drawn) {
    const base = proj(z, t.side * t.lateral);
    const top = proj(z, t.side * t.lateral, t.height);
    const alpha = clamp01(f / 0.04) * (1 - clamp01((f - 0.82) / 0.18));
    if (alpha <= 0.01) continue;
    drawTree(ctx, base.sx, base.sy, top.sy, base.s, f, t.tone, alpha);
  }

  // 6. หมอกบางที่เส้นขอบฟ้า (depth)
  const haze = ctx.createLinearGradient(0, horizonY - h * 0.09, 0, horizonY + h * 0.06);
  haze.addColorStop(0, "rgba(250,247,240,0)");
  haze.addColorStop(0.5, `rgba(233,225,205,${lerp(0.28, 0.5, p)})`);
  haze.addColorStop(1, "rgba(250,247,240,0)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, horizonY - h * 0.09, w, h * 0.15);

  // 7. god rays (แสงลอดพุ่มไม้จากขอบฟ้า)
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 6; i++) {
    const ang = lerp(-0.55, 0.55, i / 5) + Math.sin(i * 1.7) * 0.05;
    const sp = 0.028;
    const len = h * 0.95;
    const ox = cx;
    const oy = horizonY - h * 0.05;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + Math.sin(ang - sp) * len, oy + Math.cos(ang - sp) * len);
    ctx.lineTo(ox + Math.sin(ang + sp) * len, oy + Math.cos(ang + sp) * len);
    ctx.closePath();
    ctx.fillStyle = `rgba(233,205,130,${0.045 * lerp(0.4, 1, p)})`;
    ctx.fill();
  }
  ctx.restore();

  // 8. vignette (โฟกัสกลาง + cinematic)
  const vig = ctx.createRadialGradient(cx, h * 0.5, h * 0.28, cx, h * 0.5, h * 0.78);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(8,18,13,0.5)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

export default function WelcomeHero() {
  const { t, lang } = useLang();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = w + "px";
      canvas!.style.height = h + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    let raf = 0;
    function render() {
      raf = 0;
      const rect = wrap!.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = reduce ? 0.6 : clamp01(-rect.top / (total || 1));
      renderFrame(ctx!, w, h, p);
      // ข้อความ: title โผล่ช่วงแรก จางตอนใกล้จบ (ส่งต่อฟอร์ม) · cue จางหลังเริ่มเลื่อน
      if (titleRef.current) {
        const inO = clamp01(p / 0.12);
        const outO = 1 - clamp01((p - 0.78) / 0.22);
        titleRef.current.style.opacity = String(inO * outO);
        titleRef.current.style.transform = `translateY(${lerp(24, 0, inO)}px)`;
      }
      if (cueRef.current) cueRef.current.style.opacity = String(1 - clamp01(p / 0.08));
    }
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(render);
    }

    resize();
    render();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
      resize();
      render();
    });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={wrapRef} style={{ height: `${SCROLL_VH}vh` }} className="relative">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <canvas ref={canvasRef} className="block h-full w-full" />

        {/* ละอองฝุ่นลอย */}
        <DustParticles />

        {/* ข้อความต้อนรับทับ canvas */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <div ref={titleRef} style={{ opacity: 0 }}>
            <p className="text-xs font-medium tracking-[0.4em] text-cream/70 sm:text-sm">{t.hero.university}</p>
            <h1
              className="mt-4 whitespace-nowrap text-[clamp(1.5rem,7.5vw,5.5rem)] leading-none text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]"
              style={{ fontFamily: "var(--font-hand)" }}
            >
              {t.hero.title}
            </h1>
            <p
              className="mt-5 text-lg text-cream/85 sm:text-2xl"
              style={{
                // Itim รองรับไทย · อังกฤษใช้ Patrick Hand ให้เข้าชุดกับหัวเรื่อง
                fontFamily: lang === "th" ? "var(--font-hand-th)" : "var(--font-hand)",
              }}
            >
              {t.hero.subtitle}
            </p>
          </div>
        </div>

        {/* scroll cue — ด้านบน · เทาๆ ไม่แตะตา · กดลูกศรเลื่อนไปฟอร์มเลย */}
        <div
          ref={cueRef}
          className="pointer-events-none absolute inset-x-0 top-8 flex flex-col items-center gap-2"
        >
          <span className="text-[11px] uppercase tracking-[0.28em] text-cream/45">
            {t.hero.scrollCue}
          </span>
          <button
            type="button"
            aria-label={t.hero.scrollAria}
            onClick={() =>
              document.getElementById("register")?.scrollIntoView({ behavior: "smooth" })
            }
            className="pointer-events-auto animate-bounce text-cream/40 transition-colors hover:text-cream/75"
          >
            <svg width="16" height="18" viewBox="0 0 16 18" fill="none" stroke="currentColor" strokeWidth="1.2">
              <line x1="8" y1="1" x2="8" y2="11" />
              <path d="M3 9 L8 15 L13 9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
