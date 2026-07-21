"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useT } from "@/lib/i18n/LanguageProvider";

/* ============================================================
   ครอปรูปโปรไฟล์วงกลมแบบ IG: ลากเลื่อน + ซูม แล้วครอปเป็นสี่เหลี่ยม 400px
   (แสดงผลเป็นวงกลมด้วย CSS ที่ avatar)
   ============================================================ */

const CROP = 280; // ขนาดกรอบครอป (px)
const OUT = 400; // ขนาดไฟล์ผลลัพธ์ (px)

export function PhotoCropper({
  src,
  onCancel,
  onDone,
}: {
  src: string;
  onCancel: () => void;
  onDone: (dataUrl: string) => void;
}) {
  const t = useT();
  const imgRef = useRef<HTMLImageElement>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // สเกลที่ทำให้รูป "cover" กรอบพอดี แล้วคูณ zoom
  const coverScale = nat ? CROP / Math.min(nat.w, nat.h) : 1;
  const effScale = coverScale * zoom;
  const dW = nat ? nat.w * effScale : CROP;
  const dH = nat ? nat.h * effScale : CROP;

  function clamp(x: number, y: number) {
    const maxX = Math.max(0, (dW - CROP) / 2);
    const maxY = Math.max(0, (dH - CROP) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  }

  function onPointerDown(e: ReactPointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: ReactPointerEvent) {
    if (!drag.current) return;
    const nx = drag.current.ox + (e.clientX - drag.current.x);
    const ny = drag.current.oy + (e.clientY - drag.current.y);
    setOffset(clamp(nx, ny));
  }
  function onPointerUp() {
    drag.current = null;
  }

  function setZoomClamped(z: number) {
    setZoom(z);
    // เมื่อซูม ต้อง clamp offset ใหม่ (คำนวณด้วยสเกลใหม่)
    if (nat) {
      const es = coverScale * z;
      const w = nat.w * es, h = nat.h * es;
      const maxX = Math.max(0, (w - CROP) / 2), maxY = Math.max(0, (h - CROP) / 2);
      setOffset((o) => ({ x: Math.max(-maxX, Math.min(maxX, o.x)), y: Math.max(-maxY, Math.min(maxY, o.y)) }));
    }
  }

  function confirm() {
    const img = imgRef.current;
    if (!img || !nat) return;
    const srcSize = CROP / effScale;
    const srcX = (dW - CROP) / 2 / effScale - offset.x / effScale;
    const srcY = (dH - CROP) / 2 / effScale - offset.y / effScale;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUT, OUT);
    onDone(canvas.toDataURL("image/jpeg", 0.9));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[26px] bg-card p-6">
        <h3 className="mb-4 text-center text-lg font-semibold text-forestdeep">{t.photo.cropperHeading}</h3>

        {/* กรอบครอปวงกลม */}
        <div
          className="relative mx-auto touch-none overflow-hidden rounded-full border border-line"
          style={{ width: CROP, height: CROP }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt={t.photo.cropperAlt}
            draggable={false}
            onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            className="absolute max-w-none cursor-grab select-none active:cursor-grabbing"
            style={{
              width: dW,
              height: dH,
              left: (CROP - dW) / 2 + offset.x,
              top: (CROP - dH) / 2 + offset.y,
            }}
          />
        </div>

        {/* ซูม */}
        <div className="mt-5 flex items-center gap-3">
          <span className="text-muted">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="9" cy="9" r="6" /><path d="m14 14 3 3" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoomClamped(Number(e.target.value))}
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-line accent-forest"
          />
        </div>

        {/* ปุ่ม */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-5 py-2.5 text-muted transition-colors hover:text-ink"
          >
            {t.photo.cancel}
          </button>
          <button
            type="button"
            onClick={confirm}
            className="rounded-full bg-forest px-6 py-2.5 font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-forestdeep"
          >
            {t.photo.use}
          </button>
        </div>
      </div>
    </div>
  );
}
