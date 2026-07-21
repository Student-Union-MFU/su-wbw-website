"use client";

import { useMemo } from "react";
import type { Participant } from "@/lib/adminApi";
import type { School } from "@/lib/api";
import { useT } from "@/lib/i18n/LanguageProvider";

/* ============================================================
   กราฟสรุปยอดสมัคร — ยกมาจาก web/dashboard/index.html เดิม
   (แท่งแนวตั้ง = รายวัน, แท่งแนวนอน = ตามสำนักวิชา)
   วาดด้วย div ล้วน ไม่ต้องพึ่ง chart library
   ============================================================ */

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-line bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-forestdeep">{title}</h3>
      {children}
    </div>
  );
}

function Empty({ text }: { text?: string }) {
  const t = useT();
  return <div className="py-10 text-center text-sm text-muted">{text ?? t.dash.charts.noData}</div>;
}

/* ---------- สมัครรายวัน (แท่งแนวตั้ง) ---------- */
export function DailyChart({ rows }: { rows: Participant[] }) {
  const t = useT();
  const days = useMemo(() => {
    const byDay: Record<string, number> = {};
    for (const p of rows) {
      // created อาจเป็น ISO timestamp — ตัดเอาเฉพาะวันที่
      const d = String(p.created ?? "").slice(0, 10);
      if (d) byDay[d] = (byDay[d] ?? 0) + 1;
    }
    return Object.keys(byDay)
      .sort()
      .map((d) => ({ day: d, n: byDay[d] }));
  }, [rows]);

  if (!days.length) return <Panel title={t.dash.charts.daily}><Empty /></Panel>;

  const max = Math.max(...days.map((d) => d.n));

  return (
    <Panel title={t.dash.charts.daily}>
      <div className="flex h-44 items-end gap-1.5 overflow-x-auto">
        {days.map(({ day, n }) => (
          <div key={day} className="flex min-w-8 flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end">
              <div
                className="relative w-full rounded-t-md bg-forest/85 transition-all duration-300"
                style={{ height: `${(n / max) * 100}%` }}
                title={`${day}: ${t.dash.charts.people(n)}`}
              >
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[11px] font-medium text-ink">
                  {n}
                </span>
              </div>
            </div>
            <span className="text-[10px] whitespace-nowrap text-muted">
              {day.slice(8, 10)}/{day.slice(5, 7)}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------- สัดส่วนตามสำนักวิชา (แท่งแนวนอน) ---------- */
export function SchoolChart({ rows, schools }: { rows: Participant[]; schools: School[] }) {
  const t = useT();
  const bars = useMemo(() => {
    const bySchool: Record<string, number> = {};
    for (const p of rows) {
      if (p.school_id == null) continue;
      const k = String(p.school_id);
      bySchool[k] = (bySchool[k] ?? 0) + 1;
    }
    return Object.entries(bySchool)
      .map(([sid, n]) => ({
        name: schools.find((s) => String(s.school_id) === sid)?.name ?? sid,
        n,
      }))
      .sort((a, b) => b.n - a.n);
  }, [rows, schools]);

  if (!bars.length) return <Panel title={t.dash.charts.bySchool}><Empty /></Panel>;

  const max = Math.max(...bars.map((b) => b.n));

  return (
    <Panel title={t.dash.charts.bySchool}>
      <div className="space-y-2.5">
        {bars.map((b) => (
          <div key={b.name} className="flex items-center gap-3">
            <div className="w-32 flex-none truncate text-xs text-muted" title={b.name}>
              {b.name}
            </div>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-gold transition-all duration-300"
                style={{ width: `${(b.n / max) * 100}%` }}
              />
            </div>
            <div className="w-8 flex-none text-right text-xs font-medium text-ink">{b.n}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------- การ์ดโควตา (มีแถบความคืบหน้า) ---------- */
export const QUOTA = 2000;

export function QuotaCard({ total }: { total: number }) {
  const t = useT();
  const pct = Math.min(100, (total / QUOTA) * 100);
  return (
    <div className="rounded-[20px] border border-line bg-card p-5 transition-all duration-200 hover:-translate-y-0.5">
      <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gold/12 text-gold">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 19V5m0 14h16" strokeLinecap="round" />
          <path d="M8 19v-6m4 6V8m4 11v-9" strokeLinecap="round" />
        </svg>
      </span>
      <div className="text-3xl font-bold text-ink">
        {total} <small className="text-base font-normal text-muted">/ {QUOTA}</small>
      </div>
      <div className="mt-0.5 text-sm text-muted">{t.dash.charts.quota}</div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-gold transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
