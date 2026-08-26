"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createSOSCase,
  getParticipants,
  getSOSCases,
  patchSOSCase,
  type Participant,
  type SOSCase,
  type SOSSeverity,
} from "@/lib/adminApi";
import { formatTs, parseTs } from "@/lib/datetime";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { MiniStat, STATUS } from "@/components/dashboard/viz";
import { SelectField, TextField } from "@/components/register/ui";

/* ============================================================
   แท็บ "เหตุฉุกเฉิน" — ทุกเคสของทั้งงาน ไม่ใช่แค่ที่ยังเปิดอยู่

   หน้านี้ไม่ใช่หน้าจอหน้างาน (นั่นคือแอปของเจ้าหน้าที่ ซึ่ง long-poll อยู่ที่
   /staff/sos) แต่เป็นที่ที่แอดมินตอบคำถามว่า "ทั้งงานเกิดอะไรขึ้นบ้าง ใครกด
   เมื่อไหร่ เพราะอะไร จบยังไง" และเป็นทางออกฉุกเฉินเมื่อสถานะในระบบไม่ตรงกับ
   ความจริง — เคสที่ถูกกดปิดผิด เคสที่ปิดแล้วแต่เรื่องยังไม่จบ เคสที่แจ้งมาทาง
   วิทยุจึงไม่เคยมีใครกดในแอป

   จัดลำดับด้วย "ต้องทำอะไรกับมันไหม" ไม่ใช่เวลา: เคสที่ยังไม่มีใครรับขึ้นก่อน
   เสมอ แม้จะเก่ากว่าเคสที่รับแล้ว — เรียงตามเวลาล้วนจะดันเคสที่ถูกลืมไว้ลงไป
   ล่างสุดพอดี ซึ่งเป็นเคสที่ต้องเห็นที่สุด
   ============================================================ */

type Filter = "active" | "all" | "unacked" | "resolved";

const SEVERITY_TONE: Record<string, keyof typeof STATUS> = {
  minor: "good",
  major: "serious",
  urgent: "critical",
};

export function Emergency({ token, onUnauthorized }: { token: string; onUnauthorized: () => void }) {
  const { t } = useLang();
  const e = t.dash.emergency;
  const [cases, setCases] = useState<SOSCase[]>([]);
  const [people, setPeople] = useState<Participant[]>([]);
  const [filter, setFilter] = useState<Filter>("active");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    getSOSCases(token)
      .then(setCases)
      .catch((err: Error) => {
        if (err.message === "unauthorized") onUnauthorized();
        else setError(err.message === "forbidden" ? t.dash.login.forbidden : err.message);
      })
      .finally(() => setLoading(false));
  }, [token, onUnauthorized, t]);

  useEffect(() => {
    load();
    // รายชื่อผู้เข้าร่วมมีไว้ให้เลือกตอนเปิดเคสแทน — โหลดครั้งเดียวพอ
    getParticipants(token).then(setPeople).catch(() => setPeople([]));
  }, [load, token]);

  /* ทำอะไรกับเคสสักอย่าง แล้วเอาแถวที่ backend ตอบกลับมาทับของเดิม
     ไม่ reload ทั้งรายการ: หน้านี้ถูกเปิดค้างระหว่างงาน การกระตุกทั้งตารางทุกครั้ง
     ที่กดปุ่มเดียวทำให้ตำแหน่งที่กำลังอ่านอยู่หายไป */
  async function act(id: number, patch: Parameters<typeof patchSOSCase>[2]) {
    setBusy(true);
    setError(null);
    try {
      const updated = await patchSOSCase(token, id, patch);
      setCases((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : e.actionFailed);
    } finally {
      setBusy(false);
    }
  }

  const counts = useMemo(() => {
    const openCases = cases.filter((c) => !c.resolved);
    return {
      total: cases.length,
      open: openCases.length,
      unacked: openCases.filter((c) => !c.acked_at).length,
      urgent: openCases.filter((c) => c.severity === "urgent" || c.severity === "major").length,
      resolved: cases.filter((c) => c.resolved).length,
    };
  }, [cases]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const byFilter = cases.filter((c) => {
      if (filter === "active") return !c.resolved;
      if (filter === "unacked") return !c.resolved && !c.acked_at;
      if (filter === "resolved") return c.resolved;
      return true;
    });
    const byText = needle
      ? byFilter.filter((c) =>
          [`${c.first_name} ${c.last_name}`, String(c.bib ?? ""), c.checkpoint_name ?? "", c.message ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(needle),
        )
      : byFilter;

    // เรียงตามความเร่งด่วน: ยังไม่รับ → เปิดอยู่ → ปิดแล้ว · ในกลุ่มเดียวกันใหม่สุดก่อน
    const rank = (c: SOSCase) => (c.resolved ? 2 : c.acked_at ? 1 : 0);
    return [...byText].sort((a, b) => rank(a) - rank(b) || b.id - a.id);
  }, [cases, filter, q]);

  if (loading) return <p className="py-16 text-center text-sm text-muted">{t.dash.common.loading}</p>;

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-forestdeep">{e.heading}</h2>
          <p className="mt-1 text-sm text-muted">{e.sub}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-forest/40 hover:text-forest"
          >
            {t.dash.overview.refresh}
          </button>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-full bg-danger px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110"
          >
            {e.newCase}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat label={e.statTotal} value={counts.total} hint={e.statTotalSub} />
        <MiniStat label={e.statOpen} value={counts.open} tone={counts.open ? "warning" : "good"} />
        <MiniStat
          label={e.statUnacked}
          value={counts.unacked}
          tone={counts.unacked ? "critical" : "good"}
          hint={counts.unacked ? e.statUnackedSub : e.statAllPicked}
        />
        <MiniStat label={e.statSerious} value={counts.urgent} tone={counts.urgent ? "serious" : "good"} hint={e.statSeriousSub} />
      </div>

      {/* ตัวกรองอยู่แถวเดียวเหนือรายการ ไม่ซ่อนในเมนู — ระหว่างงานคนเปิดหน้านี้
          เพื่อสลับระหว่าง "ที่ยังค้าง" กับ "ทั้งหมด" ตลอดเวลา */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(["active", "unacked", "resolved", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={[
              "rounded-full px-4 py-2 text-sm transition-colors",
              filter === f ? "bg-forest text-white" : "border border-line text-muted hover:border-forest/40 hover:text-forest",
            ].join(" ")}
          >
            {e.filters[f]}
            <span className="ml-1.5 opacity-70">
              {f === "active" ? counts.open : f === "unacked" ? counts.unacked : f === "resolved" ? counts.resolved : counts.total}
            </span>
          </button>
        ))}
        <input
          value={q}
          onChange={(ev) => setQ(ev.target.value)}
          placeholder={e.search}
          className="ml-auto min-w-52 flex-1 rounded-full border border-line bg-card px-4 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-forest/50 sm:max-w-72 sm:flex-none"
        />
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-4 space-y-3">
        {shown.length === 0 ? (
          <p className="rounded-[20px] border border-line bg-card py-14 text-center text-sm text-muted">{e.empty}</p>
        ) : (
          shown.map((c) => (
            <CaseCard
              key={c.id}
              c={c}
              expanded={open === c.id}
              busy={busy}
              onToggle={() => setOpen(open === c.id ? null : c.id)}
              onAct={(patch) => act(c.id, patch)}
            />
          ))
        )}
      </div>

      {creating && (
        <NewCaseModal
          token={token}
          people={people}
          onClose={() => setCreating(false)}
          onDone={(created) => {
            setCreating(false);
            setCases((prev) => [created, ...prev]);
            setFilter("active");
          }}
        />
      )}
    </section>
  );
}

/* ---------- การ์ดเคสหนึ่งใบ ---------- */

function CaseCard({
  c,
  expanded,
  busy,
  onToggle,
  onAct,
}: {
  c: SOSCase;
  expanded: boolean;
  busy: boolean;
  onToggle: () => void;
  onAct: (patch: Parameters<typeof patchSOSCase>[2]) => void;
}) {
  const { t } = useLang();
  const e = t.dash.emergency;
  const name = `${c.first_name} ${c.last_name}`.trim() || e.unknownPerson;
  const waited = useWaited(c);

  return (
    /* ไม่มีแถบสีขอบซ้ายแล้ว — สถานะอ่านจากชิปข้อความ (StatusChip) ซึ่งมีอยู่ทุกใบ
       และบอกได้ทั้งชื่อสถานะและสี · แถบขอบเป็นสัญญาณซ้ำที่ไม่ได้เพิ่มข้อมูล */
    <article className="overflow-hidden rounded-[20px] border border-line bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-cream/40"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink">{name}</span>
            {c.bib != null && <span className="text-xs text-muted">BIB {c.bib}</span>}
            {c.group_number != null && (
              <span className="text-xs text-muted">{t.dash.common.group(c.group_number)}</span>
            )}
            <StatusChip c={c} />
            {c.for_other && <Chip tone="neutral">{e.forOther}</Chip>}
          </div>
          <p className="mt-1.5 truncate text-sm text-muted">{c.message || e.noMessage}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted/80">
            <span>{formatTs(c.created_at, t.dash.locale)}</span>
            {c.checkpoint_name && <span>{c.checkpoint_name}</span>}
            {!c.resolved && waited && <span className="text-danger">{e.waiting(waited)}</span>}
            {c.resolved && c.resolve_reason && (
              <span>{t.dash.insights.reason[c.resolve_reason] ?? c.resolve_reason}</span>
            )}
          </div>
        </div>
        <svg
          viewBox="0 0 24 24"
          className={`mt-1 h-4 w-4 flex-none text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-line px-5 py-5">
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            <Facts
              title={e.factsWho}
              rows={[
                [e.fName, name],
                [e.fBib, c.bib != null ? String(c.bib) : "—"],
                [e.fGroup, c.group_number != null ? String(c.group_number) : "—"],
                [e.fPhone, c.contact_phone ?? "—"],
                [e.fEmergency, c.emergency_contact_name ? `${c.emergency_contact_name} · ${c.emergency_contact_phone ?? "—"}` : "—"],
              ]}
            />
            <Facts
              title={e.factsCase}
              rows={[
                [e.fRaised, formatTs(c.created_at, t.dash.locale, { dateStyle: "medium", timeStyle: "short" })],
                [e.fAcked, c.acked_at ? `${formatTs(c.acked_at, t.dash.locale)}${c.acked_by_name ? ` · ${c.acked_by_name}` : ""}` : e.notAcked],
                [e.fBase, c.checkpoint_name ?? "—"],
                [
                  e.fLocation,
                  c.lat != null && c.lng != null
                    ? `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}${c.accuracy_m ? ` (±${Math.round(c.accuracy_m)} m)` : ""}`
                    : e.noLocation,
                ],
                [e.fUpdated, formatTs(c.updated_at, t.dash.locale)],
              ]}
            />
          </div>

          {/* ข้อมูลสุขภาพมาก็ต่อเมื่อ backend ยอมส่ง (ยินยอม + เคสเปิด + ไม่ใช่กดแทน)
              หน้านี้ไม่ตัดสินใจเรื่องนั้นเอง แค่แสดงสิ่งที่ได้มา */}
          {(c.blood_type || c.health_notes) && (
            <div className="mt-5 rounded-[16px] border border-danger/30 bg-danger/8 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-danger">{e.healthTitle}</p>
              {c.blood_type && (
                <p className="mt-1.5 text-sm text-ink">
                  {t.dash.participants.colBlood}: <span className="font-medium">{c.blood_type}</span>
                </p>
              )}
              {c.health_notes && <p className="mt-1 whitespace-pre-line text-sm text-ink">{c.health_notes}</p>}
            </div>
          )}

          {c.message && (
            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{e.messageTitle}</p>
              <p className="mt-1 whitespace-pre-line text-sm text-ink">{c.message}</p>
            </div>
          )}

          <Overrides c={c} busy={busy} onAct={onAct} />
        </div>
      )}
    </article>
  );
}

/* ---------- ปุ่มแก้สถานะ ---------- */

function Overrides({
  c,
  busy,
  onAct,
}: {
  c: SOSCase;
  busy: boolean;
  onAct: (patch: Parameters<typeof patchSOSCase>[2]) => void;
}) {
  const { t } = useLang();
  const e = t.dash.emergency;
  const [reason, setReason] = useState("");

  return (
    <div className="mt-6 border-t border-line pt-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{e.overrideTitle}</p>
      <p className="mt-1 text-xs text-muted/80">{e.overrideHint}</p>

      <div className="mt-3.5">
        <p className="mb-1.5 text-xs text-muted">{e.setSeverity}</p>
        <div className="flex flex-wrap gap-2">
          {(["minor", "major", "urgent"] as SOSSeverity[]).map((s) => (
            <button
              key={s}
              type="button"
              disabled={busy}
              onClick={() => onAct({ severity: c.severity === s ? "" : s })}
              className="rounded-full border px-3.5 py-1.5 text-xs transition-colors disabled:opacity-50"
              style={
                c.severity === s
                  ? { background: STATUS[SEVERITY_TONE[s]], borderColor: STATUS[SEVERITY_TONE[s]], color: "#10241a" }
                  : { borderColor: "var(--color-line)", color: "var(--color-muted)" }
              }
            >
              {t.dash.insights.sev[s]}
            </button>
          ))}
          <button
            type="button"
            disabled={busy}
            onClick={() => onAct({ escalated: !c.escalated })}
            className={[
              "rounded-full border px-3.5 py-1.5 text-xs transition-colors disabled:opacity-50",
              c.escalated ? "border-gold/60 bg-gold/15 text-gold" : "border-line text-muted hover:border-forest/40 hover:text-forest",
            ].join(" ")}
          >
            {c.escalated ? e.unescalate : e.escalate}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        {c.resolved ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onAct({ resolved: false })}
            className="rounded-full border border-gold/60 bg-gold/12 px-5 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/20 disabled:opacity-50"
          >
            {e.reopen}
          </button>
        ) : (
          <>
            <label className="flex-1">
              <span className="mb-1.5 block text-xs text-muted">{e.closeReason}</span>
              <input
                value={reason}
                onChange={(ev) => setReason(ev.target.value)}
                placeholder={e.closeReasonPlaceholder}
                className="w-full rounded-full border border-line bg-cream px-4 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-forest/50"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => onAct({ resolved: true, reason: reason.trim() || undefined })}
              className="rounded-full bg-forest px-5 py-2 text-sm font-medium text-white transition-all duration-200 hover:brightness-110 disabled:opacity-50"
            >
              {e.close}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- เปิดเคสแทนผู้เข้าร่วม ---------- */

function NewCaseModal({
  token,
  people,
  onClose,
  onDone,
}: {
  token: string;
  people: Participant[];
  onClose: () => void;
  onDone: (c: SOSCase) => void;
}) {
  const { t } = useLang();
  const e = t.dash.emergency;
  const [participantId, setParticipantId] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState("");
  const [forOther, setForOther] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(
    () =>
      people.map((p) => ({
        value: p.id,
        label: `${p.bib != null ? `#${p.bib} ` : ""}${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.student_id,
      })),
    [people],
  );

  async function submit() {
    if (!participantId) return;
    setBusy(true);
    setError(null);
    try {
      onDone(
        await createSOSCase(token, {
          participant_id: participantId,
          message: message.trim() || null,
          severity: (severity || null) as SOSSeverity | null,
          for_other: forOther,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : e.actionFailed);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[26px] border border-line bg-card p-6 sm:rounded-[26px]">
        <h3 className="text-base font-semibold text-forestdeep">{e.newCaseTitle}</h3>
        <p className="mt-1 text-sm text-muted">{e.newCaseSub}</p>

        <div className="mt-5 space-y-4">
          <SelectField
            label={e.pickParticipant}
            value={participantId}
            onChange={setParticipantId}
            options={options}
            placeholder={e.pickParticipantPlaceholder}
          />
          <TextField label={e.message} value={message} onChange={setMessage} />
          <SelectField
            label={e.severity}
            value={severity}
            onChange={setSeverity}
            options={(["minor", "major", "urgent"] as SOSSeverity[]).map((s) => ({
              value: s,
              label: t.dash.insights.sev[s],
            }))}
            placeholder={e.severityPlaceholder}
          />
          <label className="flex items-center gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={forOther}
              onChange={(ev) => setForOther(ev.target.checked)}
              className="h-4 w-4 accent-[var(--color-forest)]"
            />
            {e.forOtherLabel}
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-5 py-2.5 text-sm text-muted transition-colors hover:text-ink"
          >
            {t.dash.common.cancel}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !participantId}
            className="rounded-full bg-danger px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:brightness-110 disabled:opacity-45"
          >
            {busy ? e.opening : e.openCase}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- ชิ้นเล็ก ---------- */

function StatusChip({ c }: { c: SOSCase }) {
  const { t } = useLang();
  const e = t.dash.emergency;
  if (c.resolved) return <Chip tone="neutral">{e.chipClosed}</Chip>;
  if (!c.acked_at) return <Chip tone="critical">{e.chipUnacked}</Chip>;
  if (c.severity) return <Chip tone={SEVERITY_TONE[c.severity]}>{t.dash.insights.sev[c.severity]}</Chip>;
  return <Chip tone="warning">{e.chipOpen}</Chip>;
}

function Chip({ children, tone }: { children: React.ReactNode; tone: keyof typeof STATUS }) {
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
      style={{ background: `${STATUS[tone]}22`, color: STATUS[tone] }}
    >
      {children}
    </span>
  );
}

function Facts({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</p>
      <dl className="mt-2 space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-3 text-sm">
            <dt className="w-28 flex-none text-muted">{k}</dt>
            <dd className="min-w-0 flex-1 break-words text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** นาทีที่เคสค้างอยู่ — นับต่อเนื่องขณะหน้าเปิดค้าง
 *  ตัวเลขที่แช่อยู่กับที่บนหน้าจอที่เปิดทั้งวันคือตัวเลขที่หลอกคนอ่าน */
function useWaited(c: SOSCase) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (c.resolved) return;
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [c.resolved]);

  if (c.resolved) return null;
  const started = parseTs(c.created_at);
  if (!started) return null;
  const mins = Math.floor((Date.now() - started.getTime()) / 60000);
  return mins > 0 ? mins : null;
}
