"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getChatMessages,
  getChatRooms,
  moderateChatMessage,
  searchChat,
  type ChatAction,
  type ChatMessage,
  type ChatRoom,
} from "@/lib/adminApi";
import { formatTs } from "@/lib/datetime";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { STATUS } from "@/components/dashboard/viz";

/* ============================================================
   แท็บ "แชท" — ผู้ดูแลอ่านทุกห้อง และลบ/เซ็นเซอร์ได้ทีละข้อความ

   ⚠ สิ่งที่หน้านี้ทำไม่ได้ และควรรู้ก่อนใช้: แอปมือถือ sync แบบ "ขอข้อความหลัง
   id นี้" เท่านั้น · การลบจึงมีผลกับคนที่ยังไม่ได้อ่าน และคนที่เปิดห้องใหม่
   ไม่ใช่การถอนข้อความคืนจากเครื่องที่เห็นไปแล้ว — ข้อความจะยังค้างบนจอเครื่อง
   นั้นจนกว่าจะโหลดห้องใหม่ · ถ้าเรื่องเร่งด่วนพอที่ต้องให้ทุกคนหยุดเห็นเดี๋ยวนี้
   ให้ใช้ประกาศควบคู่ไปด้วย ไม่ใช่หวังพึ่งการลบอย่างเดียว

   หน้านี้เห็น "ของจริง" เสมอ: ข้อความที่ลบไปแล้วก็ยังอ่านได้ที่นี่ และข้อความที่
   เซ็นเซอร์แล้วยังเห็นต้นฉบับ — ไม่งั้นคนที่ต้องตัดสินใจกู้คืนต้องเดา
   ============================================================ */

export function Chats({ token, onUnauthorized }: { token: string; onUnauthorized: () => void }) {
  const { t } = useLang();
  const c = t.dash.chats;

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ChatMessage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRooms = useCallback(() => {
    getChatRooms(token)
      .then((rs) => {
        setRooms(rs);
        // เปิดห้องที่เพิ่งมีคนพิมพ์ล่าสุดให้เลย — คนเปิดแท็บนี้มักมาเพราะมีเรื่อง
        // ไม่ใช่มาไล่อ่านทุกห้องตั้งแต่ห้องที่ 1
        setActive((cur) => cur ?? rs.find((r) => r.message_count > 0)?.group_id ?? null);
      })
      .catch((e: Error) => {
        if (e.message === "unauthorized") onUnauthorized();
        else setError(e.message === "forbidden" ? t.dash.login.forbidden : e.message);
      })
      .finally(() => setLoading(false));
  }, [token, onUnauthorized, t]);

  useEffect(loadRooms, [loadRooms]);

  useEffect(() => {
    if (active == null) return;
    setLoadingRoom(true);
    getChatMessages(token, active)
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setLoadingRoom(false));
  }, [token, active]);

  /* ค้นหาข้ามทุกห้อง — ผลลัพธ์แทนที่รายการข้อความของห้อง เพราะคนที่กำลังค้น
     ไม่ได้สนใจว่าอยู่ห้องไหน สนใจว่าเจอหรือไม่เจอ */
  useEffect(() => {
    const needle = q.trim();
    if (!needle) {
      setResults(null);
      return;
    }
    const id = setTimeout(() => {
      searchChat(token, needle).then(setResults).catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(id);
  }, [q, token]);

  async function act(id: number, action: ChatAction, replacement?: string) {
    setBusy(id);
    setError(null);
    try {
      const updated = await moderateChatMessage(token, id, action, replacement);
      const swap = (list: ChatMessage[]) => list.map((m) => (m.id === id ? updated : m));
      setMessages(swap);
      setResults((r) => (r ? swap(r) : r));
      // ยอด "ลบไปแล้ว/เซ็นเซอร์แล้ว" ในรายการห้องต้องขยับตาม ไม่งั้นตัวเลขบน
      // หน้าเดียวกันขัดกันเองทันทีที่กดปุ่ม
      loadRooms();
    } catch (e) {
      setError(e instanceof Error ? e.message : c.actionFailed);
    } finally {
      setBusy(null);
    }
  }

  const shown = results ?? messages;
  const activeRoom = useMemo(() => rooms.find((r) => r.group_id === active) ?? null, [rooms, active]);
  const flagged = useMemo(() => rooms.reduce((n, r) => n + r.deleted_count + r.censored_count, 0), [rooms]);

  if (loading) return <p className="py-16 text-center text-sm text-muted">{t.dash.common.loading}</p>;

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-forestdeep">{c.heading}</h2>
          <p className="mt-1 text-sm text-muted">{c.sub}</p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={c.search}
          className="min-w-56 flex-1 rounded-full border border-line bg-card px-4 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-forest/50 sm:max-w-80 sm:flex-none"
        />
      </div>

      {/* คำเตือนเรื่องขอบเขตของการลบ — อยู่บนหน้าจอ ไม่ใช่แค่ในโค้ด เพราะคนที่
          กดลบต้องรู้ว่ามันไม่ได้ถอนข้อความคืนจากเครื่องที่เห็นไปแล้ว */}
      <p className="mb-4 rounded-[16px] border border-line bg-cream/40 px-4 py-3 text-xs leading-relaxed text-muted">
        {c.reachNote}
      </p>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {/* ---- ตัวเลือกห้องบนจอเล็ก ----
          รายการห้องสี่สิบห้องแบบ sidebar กินทั้งหน้าจอแรกบนมือถือ ต้องปัดผ่าน
          ทุกห้องก่อนจะเห็นข้อความสักข้อความ · บนจอเล็กจึงยุบเป็น select อันเดียว
          ซึ่งเลือกจากสี่สิบตัวเลือกได้ในสองแตะ และคืนพื้นที่ทั้งหมดให้ข้อความ */}
      <label className="mb-4 block lg:hidden">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
          {c.rooms}
          {flagged > 0 && <span style={{ color: STATUS.warning }}> · {c.flagged(flagged)}</span>}
        </span>
        <select
          value={active ?? ""}
          onChange={(e) => {
            setActive(Number(e.target.value));
            setQ("");
          }}
          className="w-full rounded-full border border-line bg-card px-4 py-2.5 text-sm text-ink outline-none focus:border-forest/50"
        >
          {rooms.map((r) => (
            <option key={r.group_id} value={r.group_id}>
              {t.dash.common.group(r.group_number)} · {c.roomMeta(r.message_count, r.member_count)}
              {r.deleted_count + r.censored_count > 0 ? ` · ${c.flagged(r.deleted_count + r.censored_count)}` : ""}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        {/* ---- รายการห้อง (จอใหญ่) ---- */}
        <aside className="hidden max-h-[70vh] overflow-y-auto rounded-[20px] border border-line bg-card p-2 lg:block">
          <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
            {c.rooms} {flagged > 0 && <span style={{ color: STATUS.warning }}>· {c.flagged(flagged)}</span>}
          </p>
          {rooms.map((r) => {
            const on = r.group_id === active;
            return (
              <button
                key={r.group_id}
                type="button"
                onClick={() => {
                  setActive(r.group_id);
                  setQ("");
                }}
                className={[
                  "flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left transition-colors",
                  on ? "bg-forest/12" : "hover:bg-cream/60",
                ].join(" ")}
              >
                <span className={`flex-1 text-sm ${on ? "font-medium text-forest" : "text-ink"}`}>
                  {t.dash.common.group(r.group_number)}
                </span>
                {r.deleted_count + r.censored_count > 0 && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ background: `${STATUS.warning}22`, color: STATUS.warning }}
                  >
                    {r.deleted_count + r.censored_count}
                  </span>
                )}
                <span className="text-xs tabular-nums text-muted">{r.message_count}</span>
              </button>
            );
          })}
        </aside>

        {/* ---- ข้อความ ---- */}
        <div className="rounded-[20px] border border-line bg-card">
          <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3.5 sm:px-5">
            <h3 className="text-sm font-semibold text-forestdeep">
              {results ? c.searchResults(results.length) : activeRoom ? t.dash.common.group(activeRoom.group_number) : "—"}
            </h3>
            {!results && activeRoom && (
              <p className="text-xs text-muted">
                {c.roomMeta(activeRoom.message_count, activeRoom.member_count)}
              </p>
            )}
          </header>

          <div className="max-h-[70vh] space-y-1 overflow-y-auto p-3">
            {loadingRoom ? (
              <p className="py-14 text-center text-sm text-muted">{t.dash.common.loading}</p>
            ) : shown.length === 0 ? (
              <p className="py-14 text-center text-sm text-muted">{results ? c.noResults : c.emptyRoom}</p>
            ) : (
              shown.map((m) => (
                <MessageRow
                  key={m.id}
                  m={m}
                  showGroup={!!results}
                  busy={busy === m.id}
                  onAct={(a, rep) => act(m.id, a, rep)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   ข้อความหนึ่งใบ

   วางเป็นสามชั้นตามลำดับที่คนอ่านจริง: ใครพูด → พูดว่าอะไร → เราทำอะไรกับมัน
   ของเดิมยัดทุกอย่างไว้บรรทัดเดียวจนชื่อ เวลา ป้ายสถานะ และเลขกลุ่มแย่งที่กันเอง

   วงกลมย่อชื่อทางซ้ายไม่ใช่ของประดับ: มันเป็นจุดยึดสายตาที่ทำให้ไล่ได้ว่าใคร
   พูดติดกันหลายข้อความโดยไม่ต้องอ่านชื่อซ้ำทุกบรรทัด
   ============================================================ */

function MessageRow({
  m,
  showGroup,
  busy,
  onAct,
}: {
  m: ChatMessage;
  showGroup: boolean;
  busy: boolean;
  onAct: (action: ChatAction, replacement?: string) => void;
}) {
  const { t } = useLang();
  const c = t.dash.chats;
  const [censoring, setCensoring] = useState(false);
  const [mask, setMask] = useState("");

  const name = `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || m.username || c.unknownSender;
  const isStaff = m.sender_role === "staff" || m.sender_role === "admin";
  const touched = !!(m.deleted_at || m.censored_at);

  return (
    <article
      className={[
        "group rounded-2xl p-3 transition-colors sm:p-4",
        m.deleted_at ? "bg-danger/8" : m.censored_at ? "bg-gold/8" : "hover:bg-cream/50",
      ].join(" ")}
    >
      <div className="flex gap-3">
        {/* วงกลมย่อชื่อ · เจ้าหน้าที่ใช้สีเขียวเข้มเพื่อให้แยกออกจากผู้เข้าร่วมได้
            ตั้งแต่ไกล ๆ โดยไม่ต้องอ่านป้ายบทบาท */}
        <span
          className={[
            "mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full text-xs font-semibold",
            isStaff ? "bg-forest text-white" : "bg-forest/12 text-forest",
          ].join(" ")}
          aria-hidden
        >
          {name.charAt(0).toUpperCase()}
        </span>

        <div className="min-w-0 flex-1">
          {/* บรรทัดชื่อ — รหัสนักศึกษาอยู่ติดชื่อ เพราะเวลาผู้ดูแลตามหาคนจากแชท
              สิ่งที่ต้องเอาไปค้นต่อในแท็บผู้เข้าร่วมคือรหัส ไม่ใช่ชื่อ (ชื่อซ้ำกันได้) */}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-ink">{name}</span>
            {m.student_id && <span className="font-mono text-xs text-muted">{m.student_id}</span>}
            {isStaff && (
              <span className="rounded-full bg-forest/12 px-2 py-0.5 text-[10px] font-medium text-forest">
                {m.sender_role === "admin" ? t.dash.users.roleAdmin : t.dash.users.roleStaff}
              </span>
            )}
            {showGroup && (
              <span className="rounded-full bg-line/60 px-2 py-0.5 text-[10px] text-muted">
                {t.dash.common.group(m.group_id)}
              </span>
            )}
            <span className="ml-auto whitespace-nowrap text-[11px] text-muted/80">
              {formatTs(m.created_at, t.dash.locale)}
            </span>
          </div>

          {/* ข้อความจริงเสมอ · ขีดฆ่าเมื่อถูกลบ เพื่อให้เห็นทั้ง "เขียนว่าอะไร" และ
              "ตอนนี้ผู้เข้าร่วมไม่เห็นแล้ว" ในบรรทัดเดียว */}
          <p
            className={[
              "mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed",
              m.deleted_at ? "text-muted line-through" : "text-ink",
            ].join(" ")}
          >
            {m.body}
          </p>

          {touched && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {m.deleted_at && <Tag tone="critical">{c.tagDeleted}</Tag>}
              {m.censored_at && <Tag tone="warning">{c.tagCensored}</Tag>}
              {(m.deleted_by || m.censored_by) && (
                <span className="text-[11px] text-muted/70">
                  {m.deleted_by ? c.byWhom(c.tagDeleted, m.deleted_by) : c.byWhom(c.tagCensored, m.censored_by!)}
                </span>
              )}
            </div>
          )}

          {/* ต้นฉบับก่อนเซ็นเซอร์ — คนที่จะกู้คืนต้องเห็นว่ากำลังจะคืนอะไรกลับไป */}
          {m.original_body && (
            <p className="mt-2 rounded-xl border border-line bg-cream/60 px-3 py-2 text-xs leading-relaxed text-muted">
              <span className="font-medium">{c.originalLabel}</span> {m.original_body}
            </p>
          )}

          {censoring ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={mask}
                onChange={(e) => setMask(e.target.value)}
                placeholder={c.maskPlaceholder}
                className="min-w-40 flex-1 rounded-full border border-line bg-cream px-3.5 py-1.5 text-xs text-ink outline-none focus:border-forest/50"
              />
              <Act
                busy={busy}
                onClick={() => {
                  onAct("censor", mask.trim() || undefined);
                  setCensoring(false);
                  setMask("");
                }}
              >
                {c.applyCensor}
              </Act>
              <Act busy={busy} onClick={() => setCensoring(false)}>
                {t.dash.common.cancel}
              </Act>
            </div>
          ) : (
            /* ปุ่มโผล่ตอน hover บนเดสก์ท็อป · บนจอสัมผัสไม่มี hover จึงแสดงเสมอ
               (ซ่อนไว้แล้วรอ hover บนมือถือ = ปุ่มที่กดไม่ได้เลย) */
            <div className="mt-2 flex flex-wrap gap-1.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
              {m.deleted_at ? (
                <Act busy={busy} onClick={() => onAct("restore")}>
                  {c.restore}
                </Act>
              ) : (
                <Act busy={busy} danger onClick={() => onAct("delete")}>
                  {c.delete}
                </Act>
              )}
              {m.censored_at ? (
                <Act busy={busy} onClick={() => onAct("uncensor")}>
                  {c.uncensor}
                </Act>
              ) : (
                <Act busy={busy} onClick={() => setCensoring(true)}>
                  {c.censor}
                </Act>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function Act({
  children,
  onClick,
  busy,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={[
        "rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50",
        danger
          ? "border-danger/40 text-danger hover:bg-danger/10"
          : "border-line text-muted hover:border-forest/40 hover:text-forest",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone: keyof typeof STATUS }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ background: `${STATUS[tone]}22`, color: STATUS[tone] }}
    >
      {children}
    </span>
  );
}
