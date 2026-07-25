"use client";

import { type ReactNode } from "react";
import LanguageToggle from "@/components/register/LanguageToggle";
import { useT } from "@/lib/i18n/LanguageProvider";

/* ---------- แถบหัวแผงผู้ดูแล ---------- */
export function DashHeader({ username, onLogout }: { username: string; onLogout: () => void }) {
  const t = useT();
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-cream/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div>
          <p className="text-xs tracking-wide text-gold">{t.dash.brand}</p>
          <h1 className="text-lg font-bold text-forestdeep">{t.dash.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle inline />
          <div className="hidden text-right sm:block">
            <p className="text-xs text-muted">{t.dash.header.signedInAs}</p>
            <p className="text-sm font-medium text-ink">{username || t.dash.header.fallbackUser}</p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest/10 text-sm font-bold text-forest">
            {(username || "A").charAt(0).toUpperCase()}
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-forest/40 hover:text-forest"
          >
            {t.dash.header.signOut}
          </button>
        </div>
      </div>
    </header>
  );
}

/* ---------- การ์ดสถิติ ---------- */
export function StatCard({
  label,
  value,
  icon,
  tone = "forest",
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  tone?: "forest" | "gold" | "danger";
}) {
  const toneClass =
    tone === "gold" ? "bg-gold/12 text-gold" : tone === "danger" ? "bg-danger/12 text-danger" : "bg-forest/10 text-forest";
  return (
    <div className="rounded-[20px] border border-line bg-card p-5 transition-all duration-200 hover:-translate-y-0.5">
      <span className={`mb-4 flex h-10 w-10 items-center justify-center rounded-full ${toneClass}`}>{icon}</span>
      <div className="text-3xl font-bold text-ink">{value}</div>
      <div className="mt-0.5 text-sm text-muted">{label}</div>
    </div>
  );
}
