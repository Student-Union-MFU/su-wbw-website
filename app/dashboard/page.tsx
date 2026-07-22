"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getStats,
  getBasesOverview,
  getParticipants,
  type Stats,
  type BaseOverview,
  type Participant,
} from "@/lib/adminApi";
import { getSchools, type School } from "@/lib/api";
import { useSession, isStaff } from "@/lib/session";
import { SignIn, DashHeader, StatCard } from "@/components/dashboard/ui";
import { DailyChart, SchoolChart, QuotaCard } from "@/components/dashboard/Charts";
import { Participants } from "@/components/dashboard/Participants";
import { Users } from "@/components/dashboard/Users";
import { Bases } from "@/components/dashboard/Bases";
import { Announcements } from "@/components/dashboard/Announcements";
import { Logs } from "@/components/dashboard/Logs";
import { useLang, useT } from "@/lib/i18n/LanguageProvider";

export default function DashboardPage() {
  const router = useRouter();
  const { session, ready, signIn, signOut } = useSession();

  // ผู้เข้าร่วมไม่มีสิทธิ์ใน endpoint ของแผงผู้ดูแล — เด้งไปหน้า /me ของตัวเอง
  // (ทั้งตอนเพิ่งล็อกอิน และตอนกลับมาเปิด /dashboard ทั้งที่ session เป็นผู้เข้าร่วม)
  const isParticipant = !!session && !isStaff(session.role);
  useEffect(() => {
    if (ready && isParticipant) router.replace("/me");
  }, [ready, isParticipant, router]);

  if (!ready) return null; // เลี่ยงการกระพริบตอนอ่าน localStorage
  if (!session) return <SignIn onLogin={signIn} />;
  if (isParticipant) return null; // กำลังเด้งไป /me
  return <DashboardHome token={session.token} username={session.username} onLogout={signOut} />;
}

const TAB_KEYS = ["overview", "participants", "users", "bases", "announce", "logs"] as const;
type TabKey = (typeof TAB_KEYS)[number];

function DashboardHome({ token, username, onLogout }: { token: string; username: string; onLogout: () => void }) {
  const t = useT();
  const [tab, setTab] = useState<TabKey>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [bases, setBases] = useState<BaseOverview[]>([]);
  const [rows, setRows] = useState<Participant[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setRefreshing(true);
    setError(null);
    const done = (e: Error) => {
      // 401 = token ใช้ไม่ได้ → ออกจากระบบ
      // 403 = บทบาทไม่พอสำหรับ endpoint นั้น (เช่น staff เปิดของ admin) → แค่บอก ไม่เตะออก
      if (e.message === "unauthorized") onLogout();
      else if (e.message === "forbidden") setError(t.dash.login.forbidden);
      else setError(e.message);
    };
    return Promise.allSettled([
      getStats(token).then(setStats).catch(done),
      getBasesOverview(token).then(setBases).catch(() => {}),
      getParticipants(token).then(setRows).catch(done),
      getSchools().then(setSchools).catch(() => {}),
    ]).finally(() => setRefreshing(false));
  }, [token, onLogout]);

  useEffect(() => {
    load();
  }, [load]);

  /* สถิติที่คำนวณจากรายชื่อผู้สมัคร (เหมือนแดชบอร์ดเดิม) */
  const checkedInPeople = useMemo(() => rows.filter((r) => r.checked_in).length, [rows]);
  const schoolsWithSignups = useMemo(
    () => new Set(rows.map((r) => r.school_id).filter((x) => x != null)).size,
    [rows],
  );

  return (
    <div className="dash-dark min-h-screen">
      <DashHeader username={username} onLogout={onLogout} />

      {/* แท็บ */}
      <nav className="border-b border-line bg-cream">
        <div className="mx-auto flex max-w-6xl gap-1 px-4 sm:px-6">
          {TAB_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={[
                "relative px-4 py-3 text-sm transition-colors",
                tab === key ? "font-medium text-forest" : "text-muted hover:text-ink",
              ].join(" ")}
            >
              {t.dash.tabs[key]}
              {tab === key && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-forest" />}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {tab === "overview" && (
          <>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-forestdeep">{t.dash.overview.heading}</h2>
              <button
                type="button"
                onClick={() => load()}
                disabled={refreshing}
                className="rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-forest/40 hover:text-forest disabled:opacity-60"
              >
                {refreshing ? t.dash.overview.refreshing : t.dash.overview.refresh}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label={t.dash.overview.totalSignups} value={stats?.participants ?? rows.length} tone="forest" icon={<IconUser />} />
              <QuotaCard total={rows.length} />
              <StatCard label={t.dash.overview.checkedIn} value={checkedInPeople} tone="forest" icon={<IconCheck />} />
              <StatCard label={t.dash.overview.schoolsWithSignups} value={schoolsWithSignups} tone="gold" icon={<IconSchool />} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label={t.dash.overview.totalCheckins} value={stats?.total_checkins ?? "…"} tone="forest" icon={<IconCheck />} />
              <StatCard label={t.dash.overview.openSOS} value={stats?.open_sos ?? "…"} tone="danger" icon={<IconAlert />} />
              <StatCard label={t.dash.overview.fullGroups} value={stats?.full_groups ?? "…"} tone="gold" icon={<IconGroup />} />
            </div>
            {error && <p className="mt-4 text-sm text-danger">{error}</p>}

            {/* กราฟ */}
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <DailyChart rows={rows} />
              <SchoolChart rows={rows} schools={schools} />
            </div>

            {/* ฐานกิจกรรม 8 ฐาน */}
            <h3 className="mb-4 mt-9 text-base font-semibold text-forestdeep">{t.dash.overview.activityBases}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {bases.map((b) => (
                <BaseCard key={b.id} base={b} />
              ))}
            </div>
          </>
        )}
        {tab === "participants" && <Participants token={token} />}
        {tab === "users" && <Users token={token} currentUsername={username} />}
        {tab === "bases" && <Bases token={token} />}
        {tab === "announce" && <Announcements token={token} />}
        {tab === "logs" && <Logs token={token} />}
      </main>
    </div>
  );
}

/* ---------- การ์ดฐานกิจกรรม ---------- */
function BaseCard({ base }: { base: BaseOverview }) {
  const { t, lang } = useLang();
  const name = lang === "en" && base.name_en ? base.name_en : base.name;
  const activity = lang === "en" && base.activity_name_en ? base.activity_name_en : base.activity_name;
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-[0_10px_30px_-24px_rgba(27,67,50,0.4)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gold">{t.dash.overview.base(String(base.sequence ?? ""))}</span>
        <span className="rounded-full bg-forest/10 px-2.5 py-0.5 text-xs font-medium text-forest">
          {t.dash.overview.checkins(base.checkin_count)}
        </span>
      </div>
      <p className="mt-2 font-semibold text-forestdeep">{name}</p>
      {activity && <p className="mt-0.5 text-xs text-muted">{activity}</p>}
      <div className="mt-3 border-t border-line pt-3">
        <p className="text-xs text-muted">{t.dash.overview.baseStaff}</p>
        {base.staff.length > 0 ? (
          <p className="mt-0.5 text-sm text-ink">{base.staff.map((s) => s.name).join(", ")}</p>
        ) : (
          <p className="mt-0.5 text-sm text-muted/70">{t.dash.overview.noStaff}</p>
        )}
      </div>
    </div>
  );
}

/* ---------- ไอคอน ---------- */
function IconUser() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.6-3.6 4.3-5 7-5s5.4 1.4 7 5" strokeLinecap="round" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconAlert() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 4 3 20h18L12 4Z" strokeLinejoin="round" />
      <path d="M12 10v4M12 17h.01" strokeLinecap="round" />
    </svg>
  );
}
function IconSchool() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m12 4 9 5-9 5-9-5 9-5Z" strokeLinejoin="round" />
      <path d="M6 11.5V16c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4.5" strokeLinecap="round" />
    </svg>
  );
}
function IconGroup() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c1.2-2.8 3.4-4 6-4s4.8 1.2 6 4" strokeLinecap="round" />
      <path d="M16 6.5a3 3 0 0 1 0 5.5M18 19c-.4-1.2-1-2.2-1.8-3" strokeLinecap="round" />
    </svg>
  );
}
