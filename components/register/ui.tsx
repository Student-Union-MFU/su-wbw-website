"use client";

import { useRef, useState, type ReactNode } from "react";
import { PhotoCropper } from "./PhotoCropper";
import { useLang, useT } from "@/lib/i18n/LanguageProvider";

/* ============================================================
   ชุด UI สำหรับหน้าสมัคร (คุมสไตล์ให้สม่ำเสมอ โปร่ง อ่านง่าย)
   หลักการ: white space เยอะ, เส้นขอบบาง, micro interaction ตอน hover/focus
   ============================================================ */

/* ---------- ตัวบอกขั้นตอน (progress) — อยู่บนแผงเข้มของหน้าสมัคร ---------- */
export function Stepper({ current, steps }: { current: number; steps: string[] }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={[
                  "h-2.5 w-2.5 rounded-full transition-all duration-300",
                  active ? "w-7 bg-gold" : done ? "bg-gold/55" : "bg-cream/20",
                ].join(" ")}
              />
              <span
                className={[
                  "hidden text-[11px] transition-colors sm:block",
                  active ? "text-goldsoft" : "text-cream/65",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- ป้ายชื่อช่อง: แยกเป็น grapheme เพื่อให้ลอยขึ้นทีละตัว ---------- */
function splitGraphemes(text: string, locale: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return Array.from(
      new Intl.Segmenter(locale, { granularity: "grapheme" }).segment(text),
      (s) => s.segment,
    );
  }
  return [text];
}

function WaveLabel({ text }: { text: string }) {
  const { lang } = useLang();
  return (
    <label className="wg-label">
      {splitGraphemes(text, lang).map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          className={ch === "*" ? "wg-char wg-req" : "wg-char"}
          style={{ "--index": i } as React.CSSProperties}
        >
          {ch}
        </span>
      ))}
    </label>
  );
}

/* ---------- ช่องกรอกข้อความ ---------- */
export function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  inputMode,
  maxLength,
  autoComplete,
  hint,
  required,
  min,
  max,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  inputMode?: "text" | "numeric" | "tel";
  maxLength?: number;
  autoComplete?: string;
  hint?: string;
  required?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
}) {
  // date/time แสดงค่าในช่องเสมอ → ให้ label ลอยค้างไว้
  const alwaysFilled = type === "date" || type === "time";
  return (
    <div
      className={[
        "wave-group",
        alwaysFilled ? "is-filled" : "",
        error ? "is-error" : "",
      ].join(" ")}
    >
      <input
        className="wg-input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? " "}
        inputMode={inputMode}
        maxLength={maxLength}
        autoComplete={autoComplete}
        min={min}
        max={max}
        step={step}
      />
      <span className="wg-bar" />
      <WaveLabel text={required ? `${label} *` : label} />
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

/* ---------- ช่องเลือก (dropdown) ---------- */
export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  hint,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}) {
  const t = useT();
  return (
    <div className={["wave-group is-filled", error ? "is-error" : ""].join(" ")}>
      <div className="relative">
        <select className="wg-input" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="" disabled>
            {placeholder ?? t.step3.bloodPlaceholder}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="wg-bar" />
        <svg
          className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <WaveLabel text={required ? `${label} *` : label} />
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

/* ---------- อัปโหลดรูปโปรไฟล์ (วงกลม) ---------- */
export function PhotoPicker({ value, onChange }: { value: string | null; onChange: (dataUrl: string | null) => void }) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null); // รูปดิบรอครอป

  function pick(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string); // เปิด cropper
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {cropSrc && (
        <PhotoCropper
          src={cropSrc}
          onCancel={() => setCropSrc(null)}
          onDone={(d) => {
            onChange(d);
            setCropSrc(null);
          }}
        />
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="group relative h-24 w-24 overflow-hidden rounded-full border border-cream/25 bg-cream/10 transition-transform duration-200 hover:scale-[1.03]"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={t.photo.alt} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-cream/72">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="8.5" r="3.5" />
              <path d="M4.5 19c1.5-3.5 4.2-5 7.5-5s6 1.5 7.5 5" strokeLinecap="round" />
            </svg>
          </span>
        )}
        <span
          className={[
            "absolute inset-x-0 bottom-0 py-1 text-center text-[10px] text-white transition-opacity duration-200",
            "bg-ink/45",
            value && !hover ? "opacity-0" : "opacity-100",
          ].join(" ")}
        >
          {value ? t.photo.change : t.photo.add}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}

/* ---------- ปุ่มหลัก ---------- */
export function PrimaryButton({ children, onClick, type = "button" }: { children: ReactNode; onClick?: () => void; type?: "button" | "submit" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="rounded-full bg-cream px-8 py-3 font-semibold text-forestdeep transition-all duration-200 hover:-translate-y-0.5 hover:bg-white active:translate-y-0"
    >
      {children}
    </button>
  );
}

/* ---------- ปุ่มรอง (ย้อนกลับ) ---------- */
export function GhostButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full px-5 py-3 font-medium text-cream/75 transition-colors duration-200 hover:text-cream"
    >
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 5 7 10l5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </button>
  );
}
