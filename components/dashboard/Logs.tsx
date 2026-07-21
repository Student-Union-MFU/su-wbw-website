"use client";

import { useEffect, useState } from "react";
import { getLogs, type LogEntry } from "@/lib/adminApi";
import { useT } from "@/lib/i18n/LanguageProvider";

// สีป้ายตามชนิด action
const ACTION_TONE: Record<string, string> = {
  สร้างบัญชี: "bg-forest/10 text-forest",
  แก้ไขบัญชี: "bg-gold/12 text-gold",
  เปลี่ยนรหัสผ่าน: "bg-gold/12 text-gold",
  ลบบัญชี: "bg-danger/12 text-danger",
  มอบหมายเจ้าหน้าที่: "bg-forest/10 text-forest",
  ถอดเจ้าหน้าที่: "bg-danger/12 text-danger",
  แก้ไขผู้เข้าร่วม: "bg-gold/12 text-gold",
};

function fmtTime(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleString(locale, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function Logs({ token }: { token: string }) {
  const t = useT();
  const [rows, setRows] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLogs(token).then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
  }, [token]);

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-forestdeep">{t.dash.logs.heading}</h2>
        <p className="mt-1 text-sm text-muted">{t.dash.logs.sub}</p>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-line bg-card">
        {loading ? (
          <p className="px-4 py-10 text-center text-muted">{t.dash.common.loading}</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-muted">{t.dash.logs.empty}</p>
        ) : (
          <ul>
            {rows.map((l) => (
              <li key={l.id} className="flex items-start gap-3 border-b border-line/70 px-4 py-3.5 last:border-0">
                <span className={`mt-0.5 flex-none rounded-full px-2.5 py-1 text-xs ${ACTION_TONE[l.action] ?? "bg-line/60 text-muted"}`}>
                  {t.dash.logs.action(l.action)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">{l.detail || "—"}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {t.dash.common.by(l.actor_name || t.dash.logs.system)}
                  </p>
                </div>
                <span className="flex-none text-xs text-muted">{fmtTime(l.created_at, t.dash.locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
