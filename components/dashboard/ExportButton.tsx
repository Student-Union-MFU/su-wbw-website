"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/LanguageProvider";

/* ปุ่มส่งออก CSV ที่ใช้ร่วมกันทั้งสามหน้า

   รับ onExport เป็นฟังก์ชันที่คืน Promise แทนที่จะรับ URL — เพราะสองหน้าดึงไฟล์
   จาก backend ส่วนแท็บวิเคราะห์ประกอบไฟล์เองจากก้อนที่ถืออยู่แล้ว · ปุ่มเดียว
   สถานะเดียว (กำลังทำ/ผิดพลาด) ครอบได้ทั้งสองแบบ */
export function ExportButton({ onExport, label }: { onExport: () => Promise<void>; label?: string }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      await onExport();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.dash.common.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm text-muted transition-colors hover:border-forest/40 hover:text-forest disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
          <path d="M12 3v12m0 0 4-4m-4 4-4-4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" strokeLinecap="round" />
        </svg>
        {busy ? t.dash.export.working : (label ?? t.dash.export.csv)}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
