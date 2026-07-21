"use client";

import type { ReactNode } from "react";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { Dict } from "@/lib/i18n/dictionaries";

/* ลำดับที่แสดงผล — value ตรงกับ backend chronic_conditions (ไม่แปลตามภาษา) */
export const CHRONIC_VALUES = [
  "heart",
  "hypertension",
  "stroke",
  "asthma",
  "severe_allergy",
  "rash",
  "dust_allergy",
  "respiratory",
  "other",
] as const satisfies readonly (keyof Dict["chronic"])[];

/** รายการโรคพร้อม label/desc ตามภาษาปัจจุบัน */
export function useChronic(): { value: string; label: string; desc?: string }[] {
  const t = useT();
  return CHRONIC_VALUES.map((value) => ({
    value,
    label: t.chronic[value].label,
    desc: t.chronic[value].desc || undefined,
  }));
}

/** map value → label สำหรับแสดงชื่อโรคใน popup */
export function useChronicLabel(): Record<string, string> {
  const t = useT();
  return Object.fromEntries(CHRONIC_VALUES.map((v) => [v, t.chronic[v].label]));
}

/* ---------- แถวเลือกโรค (checkbox สวยเอง) ---------- */
export function DiseaseCheck({
  label,
  desc,
  checked,
  onToggle,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        "flex w-full items-start gap-3 rounded-[16px] border p-4 text-left transition-all duration-200",
        checked ? "border-forest bg-forest/5" : "border-line bg-white hover:border-forest/40",
      ].join(" ")}
    >
      <span
        className={[
          "mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-md border transition-all duration-200",
          checked ? "border-forest bg-forest" : "border-line bg-white",
        ].join(" ")}
      >
        {checked && (
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m5 10.5 3.5 3.5L15 6.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span>
        <span className="block font-medium text-ink">{label}</span>
        {desc && <span className="mt-0.5 block text-sm leading-relaxed text-muted">{desc}</span>}
      </span>
    </button>
  );
}

/* ---------- Popup จดหมายขออภัย (เมื่อมีโรคประจำตัว) ---------- */
export function ApologyPopup({
  name,
  diseases,
  onClose,
}: {
  name: string;
  diseases: string[];
  onClose: () => void;
}) {
  const t = useT();
  const chronicLabel = useChronicLabel();
  const list = diseases.map((v) => chronicLabel[v] ?? v).join(", ");
  const who = name.trim() || t.page.fallbackName;

  return (
    <Overlay onClose={onClose}>
      <h3 className="mb-5 text-center text-lg font-semibold text-forestdeep">{t.apology.heading}</h3>
      <div className="space-y-3 text-[15px] leading-relaxed text-ink">
        <p>{t.apology.dear(who)}</p>
        <p>
          {t.apology.bodyBefore}
          <span className="font-medium text-forest"> “{list}” </span>
          {t.apology.bodyAfter}
        </p>
        <p>{t.apology.contact}</p>
      </div>
      <p className="mt-5 text-right text-sm text-muted">
        {t.apology.signOff}
        <br />
        {t.apology.team}
      </p>
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-forest px-8 py-3 font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-forestdeep"
        >
          {t.apology.acknowledge}
        </button>
      </div>
    </Overlay>
  );
}

function Overlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-[26px] bg-card p-7 shadow-[0_30px_80px_-40px_rgba(27,67,50,0.5)]">
        {children}
      </div>
    </div>
  );
}
