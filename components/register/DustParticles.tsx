"use client";

import { useEffect, useRef } from "react";

/**
 * ละอองฝุ่นลอย (แบบ milli) — canvas overlay อนิเมตต่อเนื่อง ลอยขึ้นเบาๆ + แกว่ง + วิบวับ
 * วางทับฉาก hero (absolute inset-0, pointer-events-none) · เคารพ prefers-reduced-motion
 */
export default function DustParticles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let parts: {
      x: number;
      y: number;
      r: number;
      vy: number;
      drift: number;
      ph: number;
      a: number;
      gold: boolean;
    }[] = [];

    function seed() {
      const count = Math.min(90, Math.max(28, Math.round((w * h) / 22000)));
      parts = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.5 + Math.random() * 2,
        vy: -(0.08 + Math.random() * 0.32), // ลอยขึ้นช้าๆ
        drift: 0.15 + Math.random() * 0.5, // แกว่งซ้ายขวา
        ph: Math.random() * Math.PI * 2,
        a: 0.12 + Math.random() * 0.4,
        gold: Math.random() < 0.25, // บางเม็ดออกทอง
      }));
    }

    function resize() {
      w = parent!.clientWidth;
      h = parent!.clientHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = w + "px";
      canvas!.style.height = h + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    let raf = 0;
    let frame = 0;
    function tick() {
      raf = requestAnimationFrame(tick);
      frame++;
      ctx!.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.y += p.vy;
        p.x += Math.sin(p.y * 0.012 + p.ph) * p.drift * 0.4;
        if (p.y < -4) {
          p.y = h + 4;
          p.x = Math.random() * w;
        }
        const tw = 0.65 + 0.35 * Math.sin(frame * 0.02 + p.ph); // วิบวับ
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = p.gold
          ? `rgba(233,205,130,${p.a * tw})`
          : `rgba(250,247,240,${p.a * tw})`;
        ctx!.fill();
      }
    }

    resize();
    tick();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 z-[1]" />;
}
