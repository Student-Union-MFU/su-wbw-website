"use client";

import { useEffect, useState } from "react";
import ForestScene from "@/components/ForestScene";
import NavBar from "@/components/landing/NavBar";
import {
  getPublicAnnouncements,
  getMyAnnouncements,
  type Announcement,
} from "@/lib/adminApi";
import { useSession } from "@/lib/session";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { DAY_STILL } from "@/lib/dayCycle";
import { formatTs } from "@/lib/datetime";

/**
 * หน้าประกาศ — ดึงจากตารางประกาศฝั่ง admin (backend notifications)
 *   · ล็อกอินแล้ว → ประกาศของตัวเอง (all + เจาะจงกลุ่ม/สำนัก/รายบุคคล)
 *   · ยังไม่ล็อกอิน → ประกาศสาธารณะ (audience=all) ผ่าน endpoint /public
 * สไตล์เดียวกับหน้าอื่น: ฉากป่า 3D เป็นพื้นหลัง การ์ดกระจกเข้ม ไม่มีพื้นทึบ
 */


const LEVEL: Record<string, { dot: string; ring: string }> = {
  info: { dot: "bg-cream/70", ring: "border-cream/15" },
  warning: { dot: "bg-gold", ring: "border-gold/40" },
  emergency: { dot: "bg-danger", ring: "border-danger/50" },
};

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

export default function AnnouncementsPage() {
  const { t, lang } = useLang();
  const { session, ready } = useSession();
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    setError(false);
    setItems(null);
    const req = session ? getMyAnnouncements(session.token) : getPublicAnnouncements();
    req
      .then((list) => alive && setItems(list))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [ready, session]);

  const levelLabel: Record<string, string> = {
    info: t.announcements.levelInfo,
    warning: t.announcements.levelWarning,
    emergency: t.announcements.levelEmergency,
  };

  return (
    <>
      <ForestScene day={DAY_STILL} focus="center" />
      <NavBar />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 pb-24 pt-28 sm:pt-32">
        <header className="text-center">
          <p className="text-[10px] uppercase tracking-[0.42em] text-goldsoft sm:text-xs">
            {t.announcements.eyebrow}
          </p>
          <h1
            className="mt-4 text-[clamp(2rem,5vw,3.2rem)] leading-[1.05] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
            style={{ fontFamily: lang === "th" ? "var(--font-hand-th)" : "var(--font-hand)" }}
          >
            {t.announcements.heading}
          </h1>
          <p className="mt-3 text-sm text-cream/78">{t.announcements.sub}</p>
        </header>

        <div className="mt-9 space-y-4">
          {items === null && !error ? (
            <div className="animate-pulse space-y-4" aria-hidden>
              <div className="h-28 rounded-[22px] border border-cream/10 bg-ink/60" />
              <div className="h-28 rounded-[22px] border border-cream/10 bg-ink/60" />
            </div>
          ) : error ? (
            <p className="rounded-[18px] border border-danger/40 bg-danger/15 px-5 py-4 text-center text-sm text-[#ffc4c4]">
              {t.announcements.error}
            </p>
          ) : items && items.length === 0 ? (
            <div className="rounded-[22px] border border-cream/12 bg-ink/70 px-6 py-14 text-center backdrop-blur-xl">
              <svg className="mx-auto h-9 w-9 text-cream/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 20a2 2 0 0 0 4 0" strokeLinecap="round" />
              </svg>
              <p className="mt-4 text-sm text-cream/70">{t.announcements.empty}</p>
            </div>
          ) : (
            items?.map((a) => {
              const lv = LEVEL[a.level] ?? LEVEL.info;
              return (
                <article
                  key={a.id}
                  className={`rounded-[22px] border ${lv.ring} bg-ink/78 p-5 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:p-6`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2 w-2 flex-none rounded-full ${lv.dot}`} />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cream/60">
                      {levelLabel[a.level] ?? a.level}
                    </span>
                    <span className="ml-auto text-xs text-cream/50">{formatTs(a.created_at, t.dash.locale, DATE_OPTS)}</span>
                  </div>

                  <h2 className="mt-3 text-lg font-bold leading-snug text-cream">{a.title}</h2>
                  {a.body && (
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-cream/80">{a.body}</p>
                  )}
                  {a.creator_name && (
                    <p className="mt-4 text-xs text-cream/45">
                      {t.announcements.by} {a.creator_name}
                    </p>
                  )}
                </article>
              );
            })
          )}
        </div>
      </main>
    </>
  );
}
