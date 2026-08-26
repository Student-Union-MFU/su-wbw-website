"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  getStats,
  getBasesOverview,
  getParticipants,
  getAnalytics,
  type Stats,
  type BaseOverview,
  type Participant,
  type Analytics,
} from "@/lib/adminApi";
import { useSession, homePathForRole } from "@/lib/session";
import { DashHeader } from "@/components/dashboard/ui";
import { Participants } from "@/components/dashboard/Participants";
import { Users } from "@/components/dashboard/Users";
import { StaffRequests } from "@/components/dashboard/StaffRequests";
import { Bases } from "@/components/dashboard/Bases";
import { Announcements } from "@/components/dashboard/Announcements";
import { Logs } from "@/components/dashboard/Logs";
import { Insights } from "@/components/dashboard/Insights";
import { Emergency } from "@/components/dashboard/Emergency";
import { Chats } from "@/components/dashboard/Chats";
import { BarsH, Columns, Meter, Panel, STATUS } from "@/components/dashboard/viz";
import { useLang, useT } from "@/lib/i18n/LanguageProvider";

export default function DashboardPage() {
  const router = useRouter();
  const { session, ready, signOut } = useSession();

  // แผงนี้เป็นของผู้ดูแล (admin) เท่านั้น · ล็อกอินย้ายไปหน้า /auth แล้ว
  //   ยังไม่ล็อกอิน       → /auth/staff/login (หน้าเข้าสู่ระบบของเจ้าหน้าที่/ผู้ดูแล)
  //   บทบาทอื่น (ไม่ใช่ admin) → หน้าของตัวเอง (participant → /participant/me · staff → /staff/me)
  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace("/auth/staff/login");
    else if (session.role !== "admin") router.replace(homePathForRole(session.role));
  }, [ready, session, router]);

  if (!ready) return null; // เลี่ยงการกระพริบตอนอ่าน localStorage
  if (!session || session.role !== "admin") return null; // กำลังเด้งไปหน้าที่ถูกต้อง
  return <DashboardHome token={session.token} username={session.username} onLogout={signOut} />;
}

/* ============================================================
   แถบเมนู — จัดกลุ่มตาม "คำถามที่คนเปิดแท็บนั้นกำลังจะถาม"

   ของเดิมเป็นแท็บข้อความเรียงกันแปดอันความสำคัญเท่ากันหมด ซึ่งแปลว่าไม่มีอันไหน
   สำคัญ · สามกลุ่มนี้คือสามสถานะจริงของคนใช้งาน:
     ดู    — ตัวเลขและกราฟ ไม่แก้อะไร
     งาน   — สิ่งที่เกิดขึ้นระหว่างวันงานและต้องลงมือ
     ตั้งค่า — ทะเบียนคนและประกาศ ทำก่อนงานเป็นหลัก
   ตัวเลขบนแท็บ (badge) คือครึ่งหลังของเรื่อง: มันบอกว่าตอนนี้ควรกดแท็บไหน
   โดยไม่ต้องเข้าไปดูทีละอัน ซึ่งเป็นสิ่งที่แถบเมนูข้อความล้วนทำไม่ได้เลย
   ============================================================ */

const TAB_KEYS = [
  "overview",
  "insights",
  "emergency",
  "chats",
  "participants",
  "bases",
  "users",
  "requests",
  "announce",
  "logs",
] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_GROUP: Record<TabKey, "view" | "live" | "setup"> = {
  overview: "view",
  insights: "view",
  emergency: "live",
  chats: "live",
  participants: "live",
  bases: "live",
  users: "setup",
  requests: "setup",
  announce: "setup",
  logs: "setup",
};

function DashboardHome({ token, username, onLogout }: { token: string; username: string; onLogout: () => void }) {
  const t = useT();
  const [tab, setTab] = useState<TabKey>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [bases, setBases] = useState<BaseOverview[]>([]);
  const [rows, setRows] = useState<Participant[]>([]);
  // ก้อนสถิติเต็มถูกใช้สองที่: ตัวเลขบนหน้าภาพรวม และ badge บนแถบเมนู
  // (แท็บ "วิเคราะห์" ดึงก้อนของตัวเองตอนเปิด ไม่ได้ใช้ตัวนี้)
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
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
      getAnalytics(token).then(setAnalytics).catch(() => {}),
    ]).finally(() => setRefreshing(false));
  }, [token, onLogout]);

  useEffect(() => {
    load();
  }, [load]);

  /* badge บนแท็บ — เฉพาะสิ่งที่ "ต้องมีคนทำอะไรกับมัน" ไม่ใช่ยอดรวมทั่วไป
     ยอดรวมบนแท็บทุกอันจะกลายเป็นเสียงรบกวนที่ไม่มีใครอ่านภายในวันเดียว */
  const badges: Partial<Record<TabKey, { n: number; urgent?: boolean }>> = useMemo(
    () => ({
      emergency: analytics
        ? { n: analytics.sos.open, urgent: analytics.sos.open_unacked > 0 }
        : undefined,
      requests: analytics?.staff.pending ? { n: analytics.staff.pending } : undefined,
    }),
    [analytics],
  );

  return (
    <div className="dash-dark min-h-screen">
      <DashHeader username={username} onLogout={onLogout} />
      <TabBar tab={tab} setTab={setTab} badges={badges} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {tab === "overview" && (
          <Overview
            stats={stats}
            analytics={analytics}
            bases={bases}
            rows={rows}
            error={error}
            refreshing={refreshing}
            onRefresh={load}
            goTo={setTab}
          />
        )}
        {tab === "insights" && <Insights token={token} onUnauthorized={onLogout} />}
        {tab === "emergency" && <Emergency token={token} onUnauthorized={onLogout} />}
        {tab === "chats" && <Chats token={token} onUnauthorized={onLogout} />}
        {tab === "participants" && <Participants token={token} />}
        {tab === "users" && <Users token={token} currentUsername={username} />}
        {tab === "requests" && <StaffRequests token={token} />}
        {tab === "bases" && <Bases token={token} />}
        {tab === "announce" && <Announcements token={token} />}
        {tab === "logs" && <Logs token={token} />}
      </main>
    </div>
  );
}

/* ---------- แถบแท็บ ---------- */

function TabBar({
  tab,
  setTab,
  badges,
}: {
  tab: TabKey;
  setTab: (k: TabKey) => void;
  badges: Partial<Record<TabKey, { n: number; urgent?: boolean }>>;
}) {
  const t = useT();
  return (
    <nav className="border-b border-line bg-cream">
      <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TAB_KEYS.map((key, i) => {
          const active = tab === key;
          const badge = badges[key];
          // เส้นคั่นบาง ๆ ตรงรอยต่อของกลุ่ม — บอกว่ามีการจัดกลุ่มอยู่โดยไม่ต้อง
          // ใส่หัวข้อกลุ่มซึ่งจะกินความกว้างที่แถบนี้ไม่มีเหลือบนมือถือ
          const newGroup = i > 0 && TAB_GROUP[key] !== TAB_GROUP[TAB_KEYS[i - 1]];
          return (
            <div key={key} className="flex flex-none items-center">
              {newGroup && <span className="mx-2 h-5 w-px bg-line" aria-hidden />}
              <button
                type="button"
                onClick={() => setTab(key)}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-sm transition-colors",
                  active ? "bg-forest text-white" : "text-muted hover:bg-forest/8 hover:text-ink",
                ].join(" ")}
              >
                <TabIcon name={key} />
                {t.dash.tabs[key]}
                {badge && badge.n > 0 && (
                  <span
                    className="ml-0.5 min-w-5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none"
                    style={
                      badge.urgent
                        ? { background: STATUS.critical, color: "#fff" }
                        : active
                          ? { background: "rgba(255,255,255,0.25)", color: "#fff" }
                          : { background: `${STATUS.warning}22`, color: STATUS.warning }
                    }
                  >
                    {badge.n}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

/* ============================================================
   หน้าภาพรวม

   ลำดับของหน้านี้คือลำดับความเร่งด่วน ไม่ใช่ลำดับของตาราง:
     1. อะไรที่ต้องทำเดี๋ยวนี้ (และไม่โชว์อะไรเลยถ้าไม่มี)
     2. ยอดที่นั่ง — ตัวเลขที่ถูกถามบ่อยที่สุดก่อนวันงาน
     3. งานเดินไปถึงไหนแล้ว
     4. รายละเอียดของฐาน
   ของเดิมเป็นการ์ดตัวเลขเจ็ดใบขนาดเท่ากันเรียงกัน ซึ่งอ่านแล้วไม่รู้ว่าควรสนใจ
   อันไหนก่อน และไม่มีอันไหนพาไปทำอะไรต่อได้
   ============================================================ */

function Overview({
  stats,
  analytics,
  bases,
  rows,
  error,
  refreshing,
  onRefresh,
  goTo,
}: {
  stats: Stats | null;
  analytics: Analytics | null;
  bases: BaseOverview[];
  rows: Participant[];
  error: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  goTo: (k: TabKey) => void;
}) {
  const t = useT();
  const o = t.dash.overview;
  const cap = analytics?.capacity;
  const taken = cap?.taken ?? stats?.participants ?? rows.length;
  const max = cap?.max ?? 2000;

  /* สิ่งที่ต้องมีคนลงมือ — แต่ละใบพาไปยังแท็บที่แก้เรื่องนั้นได้จริง
     ใบที่ค่าเป็นศูนย์ไม่ถูกสร้างเลย ไม่ใช่แสดงเป็น 0: การ์ด "SOS ค้าง 0" ที่โผล่
     ทุกวันทำให้คนเลิกอ่านแถวนี้ แล้ววันที่มันไม่เป็นศูนย์ก็จะไม่มีใครสังเกต */
  const todo = useMemo(() => {
    if (!analytics) return [];
    const a = analytics;
    const items: { key: string; label: string; n: number; tone: keyof typeof STATUS; go: TabKey }[] = [];
    if (a.sos.open_unacked > 0)
      items.push({ key: "unacked", label: o.todoUnackedSOS, n: a.sos.open_unacked, tone: "critical", go: "emergency" });
    if (a.sos.open > 0)
      items.push({ key: "opensos", label: o.todoOpenSOS, n: a.sos.open, tone: "serious", go: "emergency" });
    if (a.staff.pending > 0)
      items.push({ key: "pending", label: o.todoStaffRequests, n: a.staff.pending, tone: "warning", go: "requests" });
    const basesNoStaff = a.staff.bases_total - a.staff.bases_with_staff;
    if (basesNoStaff > 0)
      items.push({ key: "nostaff", label: o.todoBasesNoStaff, n: basesNoStaff, tone: "warning", go: "bases" });
    if (a.groups.unassigned > 0)
      items.push({ key: "ungrouped", label: o.todoUngrouped, n: a.groups.unassigned, tone: "warning", go: "participants" });
    return items;
  }, [analytics, o]);

  const regBars = useMemo(
    () =>
      (analytics?.registration ?? []).map((d) => ({
        key: d.day,
        label: d.day,
        value: d.count,
        note: `${d.day.slice(8, 10)}/${d.day.slice(5, 7)}`,
      })),
    [analytics],
  );

  const schoolBars = useMemo(
    () =>
      (analytics?.demographics.school ?? []).slice(0, 6).map((s) => ({
        key: String(s.school_id ?? "none"),
        label: s.name || t.dash.insights.unknown,
        value: s.count,
      })),
    [analytics, t],
  );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-forestdeep">{o.heading}</h2>
          <p className="mt-0.5 text-sm text-muted">{o.sub}</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-forest/40 hover:text-forest disabled:opacity-60"
        >
          {refreshing ? o.refreshing : o.refresh}
        </button>
      </div>

      {/* 1 · ต้องจัดการ */}
      <section className="mb-8">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{o.todoTitle}</h3>
        {todo.length === 0 ? (
          <p className="rounded-[20px] border border-line bg-card px-5 py-4 text-sm text-muted">
            <span className="mr-2 text-base" style={{ color: STATUS.good }}>
              ✓
            </span>
            {o.todoClear}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {todo.map((it) => (
              <button
                key={it.key}
                type="button"
                onClick={() => goTo(it.go)}
                className="group flex items-center gap-4 rounded-[20px] border border-line bg-card px-5 py-4 text-left transition-all duration-200 hover:-translate-y-0.5"
              >
                <span className="text-3xl font-bold tabular-nums leading-none" style={{ color: STATUS[it.tone] }}>
                  {it.n}
                </span>
                <span className="min-w-0 flex-1 text-sm text-ink">{it.label}</span>
                <span className="flex-none text-muted transition-transform group-hover:translate-x-0.5" aria-hidden>
                  →
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 2 · ที่นั่ง + ยอดหลัก */}
      <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div className="rounded-[20px] border border-line bg-card p-5">
          <p className="text-xs text-muted">{o.totalSignups}</p>
          <p className="mt-1 text-5xl font-bold leading-none tabular-nums text-ink">
            {taken.toLocaleString(t.dash.locale)}
          </p>
          <p className="mt-1.5 text-xs text-muted">{o.ofSeats(max)}</p>
          <div className="mt-4">
            <Meter
              label={t.dash.charts.quota}
              value={taken}
              total={max}
              tone={taken >= max ? "critical" : taken / max > 0.9 ? "warning" : "good"}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Tile label={o.checkedIn} value={cap?.checked_in ?? rows.filter((r) => r.checked_in).length} />
          <Tile label={t.dash.insights.onRoute} value={analytics?.checkins.walkers ?? "…"} />
          <Tile label={o.totalCheckins} value={stats?.total_checkins ?? "…"} />
          <Tile
            label={o.openSOS}
            value={stats?.open_sos ?? "…"}
            tone={analytics && analytics.sos.open > 0 ? "critical" : "good"}
          />
        </div>
      </section>

      {error && <p className="mb-6 text-sm text-danger">{error}</p>}

      {/* 3 · กราฟย่อ — เจาะลึกอยู่ในแท็บ "วิเคราะห์" หน้านี้แค่บอกรูปร่างคร่าว ๆ */}
      <section className="mb-9 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title={t.dash.insights.regDaily}
          right={
            <button
              type="button"
              onClick={() => goTo("insights")}
              className="flex-none text-[11px] text-muted underline decoration-line underline-offset-2 transition-colors hover:text-forest"
            >
              {o.seeMore}
            </button>
          }
        >
          <Columns items={regBars} />
        </Panel>
        <Panel title={t.dash.insights.schoolSplit}>
          <BarsH items={schoolBars} total={analytics?.demographics.profiled} />
        </Panel>
      </section>

      {/* 4 · ฐาน */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-forestdeep">{o.activityBases}</h3>
        <button
          type="button"
          onClick={() => goTo("bases")}
          className="text-xs text-muted underline decoration-line underline-offset-2 transition-colors hover:text-forest"
        >
          {o.manageBases}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {bases.map((b) => (
          <BaseCard key={b.id} base={b} />
        ))}
      </div>
    </>
  );
}

function Tile({ label, value, tone }: { label: string; value: number | string; tone?: keyof typeof STATUS }) {
  return (
    <div className="rounded-[20px] border border-line bg-card p-5">
      <p className="text-xs text-muted">{label}</p>
      <p
        className="mt-1 text-3xl font-bold tabular-nums text-ink"
        style={tone ? { color: STATUS[tone] } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

/* ---------- การ์ดฐานกิจกรรม (ดีไซน์เดิม) ---------- */

function BaseCard({ base }: { base: BaseOverview }) {
  const { t, lang } = useLang();
  const name = lang === "en" && base.name_en ? base.name_en : base.name;
  const activity = lang === "en" && base.activity_name_en ? base.activity_name_en : base.activity_name;
  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-card p-5 shadow-[0_10px_30px_-24px_rgba(27,67,50,0.4)]">
      <span className="text-xs font-semibold text-gold">{t.dash.overview.base(String(base.sequence ?? ""))}</span>
      <p className="mt-2 font-semibold text-forestdeep">{name}</p>
      {activity && <p className="mt-0.5 text-xs text-muted">{activity}</p>}
      {/* ไม่มีรายชื่อเจ้าหน้าที่บนการ์ดนี้ — เรื่องกำลังคนอยู่ในแท็บ "ฐาน" ซึ่งเป็น
          ที่เดียวที่มอบหมายได้จริง · การ์ดบนหน้าภาพรวมตอบแค่ "ฐานนี้ชื่ออะไร
          ทำอะไร มีคนผ่านไปแล้วกี่คน" และแถว "ต้องจัดการ" ด้านบนก็นับฐานที่ยัง
          ไม่มีคนดูแลให้อยู่แล้ว */}
      {/* ยอดเช็คอินอยู่ท้ายการ์ด · mt-auto ดันลงไปชิดขอบล่างเสมอ ไม่ว่าชื่อฐานจะ
          ยาวกี่บรรทัดหรือมีเจ้าหน้าที่กี่คน — ไม่งั้นแต่ละใบในแถวเดียวกันจะวาง
          ป้ายไม่ตรงระดับกัน แล้วอ่านเทียบข้ามใบไม่ได้ (การ์ดยืดเต็มความสูงแถว
          อยู่แล้วจาก items-stretch ที่เป็นค่าตั้งต้นของ grid) */}
      <div className="mt-auto pt-3">
        <span className="inline-block rounded-full bg-forest/10 px-2.5 py-0.5 text-xs font-medium text-forest">
          {t.dash.overview.checkins(base.checkin_count)}
        </span>
      </div>
    </div>
  );
}

/* ---------- ไอคอนแท็บ ---------- */

function TabIcon({ name }: { name: TabKey }) {
  const p: Record<TabKey, ReactNode> = {
    overview: (
      <>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
      </>
    ),
    insights: (
      <>
        <path d="M4 19V5m0 14h16" strokeLinecap="round" />
        <path d="M8 19v-5m4 5V9m4 10v-8" strokeLinecap="round" />
      </>
    ),
    emergency: (
      <>
        <path d="M12 4 3 20h18L12 4Z" strokeLinejoin="round" />
        <path d="M12 10v4M12 17h.01" strokeLinecap="round" />
      </>
    ),
    chats: (
      <>
        <path d="M20 12a7 7 0 0 1-7 7H8l-4 3v-4.5A7 7 0 0 1 6 5.9 7 7 0 0 1 13 5a7 7 0 0 1 7 7Z" strokeLinejoin="round" />
      </>
    ),
    participants: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 19c1.2-2.8 3.4-4 6-4s4.8 1.2 6 4" strokeLinecap="round" />
        <path d="M16 6.5a3 3 0 0 1 0 5.5" strokeLinecap="round" />
      </>
    ),
    bases: (
      <>
        <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" strokeLinejoin="round" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    users: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c1.6-3.6 4.3-5 7-5s5.4 1.4 7 5" strokeLinecap="round" />
      </>
    ),
    requests: (
      <>
        <path d="M5 12.5 10 17l9-10" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    announce: (
      <>
        <path d="M4 9v6h3l6 4V5L7 9H4Z" strokeLinejoin="round" />
        <path d="M17.5 9.5a4 4 0 0 1 0 5" strokeLinecap="round" />
      </>
    ),
    logs: (
      <>
        <path d="M6 4h9l4 4v12H6z" strokeLinejoin="round" />
        <path d="M9 12h7M9 16h5" strokeLinecap="round" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      {p[name]}
    </svg>
  );
}
