"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getCheckpoints, getGroups, type Checkpoint, type NotiGroup } from "@/lib/adminApi";
import { formatDuration, formatTs } from "@/lib/datetime";
import {
  dwellAtBase,
  groupStatus,
  groupTimeline,
  isValidStore,
  perBaseAverages,
  perGroupTotals,
  suggestNextCheckpoint,
  useGroupTime,
  useNow,
  type GroupTimeVisit,
} from "@/lib/groupTime";
import { useLang, useT } from "@/lib/i18n/LanguageProvider";
import type { Dict } from "@/lib/i18n/dictionaries";

/** ชื่อฐานตามภาษาปัจจุบัน — ไม่มีคำแปลอังกฤษ → fall back เป็นไทย */
const baseName = (b: { name: string; name_en: string | null }, lang: string) =>
  lang === "en" && b.name_en ? b.name_en : b.name;

// เกินเท่านี้ถือว่า "นานผิดปกติ" — ค่าคงที่พอสำหรับ v1 ยังไม่ต้องตั้งค่าได้
const STUCK_MS = 30 * 60_000;

const durLabels = (t: Dict) => ({ hr: t.dash.grouptime.unitHr, min: t.dash.grouptime.unitMin });
const timeOpts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };

export function GroupTime({ token }: { token: string }) {
  const t = useT();
  const [groups, setGroups] = useState<NotiGroup[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [view, setView] = useState<"board" | "summary">("board");
  const [detailGroup, setDetailGroup] = useState<NotiGroup | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const gt = useGroupTime();

  useEffect(() => {
    let alive = true;
    Promise.all([getGroups(token), getCheckpoints(token)])
      .then(([gs, cps]) => {
        if (!alive) return;
        setGroups(gs.slice().sort((a, b) => a.group_number - b.group_number));
        // จับเวลาเฉพาะฐานกิจกรรมตามลำดับเส้นทาง — ประเภทอื่น (ห้องน้ำ ฯลฯ) ไม่ใช่จุดแวะของกลุ่ม
        setCheckpoints(
          cps
            .filter((c) => c.type === "activity")
            .slice()
            .sort((a, b) => (a.sequence ?? 999) - (b.sequence ?? 999)),
        );
      })
      .catch(() => alive && setLoadError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token]);

  function doExport() {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const blob = new Blob([JSON.stringify(gt.store, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wbw-grouptime-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function doImport(file: File) {
    file.text().then((text) => {
      try {
        const parsed: unknown = JSON.parse(text);
        if (!isValidStore(parsed)) throw new Error("invalid");
        if (!window.confirm(t.dash.grouptime.importConfirm)) return;
        gt.replaceAll(parsed);
      } catch {
        window.alert(t.dash.grouptime.importInvalid);
      }
    });
  }

  if (loading) return <p className="text-muted">{t.dash.common.loading}</p>;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-forestdeep">{t.dash.grouptime.heading}</h2>
          <p className="mt-1 text-sm text-muted">{t.dash.grouptime.sub}</p>
          <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-gold/12 px-2.5 py-1 text-xs text-golddeep">
            <IconInfo />
            {t.dash.grouptime.localNote}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={gt.undoLast} disabled={!gt.canUndo}>{t.dash.grouptime.undo}</SecondaryButton>
          <SecondaryButton onClick={doExport} disabled={gt.store.visits.length === 0}>{t.dash.grouptime.export}</SecondaryButton>
          <SecondaryButton onClick={() => importRef.current?.click()}>{t.dash.grouptime.import}</SecondaryButton>
          <SecondaryButton
            danger
            disabled={gt.store.visits.length === 0}
            onClick={() => window.confirm(t.dash.grouptime.clearConfirm) && gt.clearAll()}
          >
            {t.dash.grouptime.clear}
          </SecondaryButton>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) doImport(f);
              e.target.value = ""; // ให้เลือกไฟล์เดิมซ้ำได้
            }}
          />
        </div>
      </div>

      {loadError && <p className="mb-4 rounded-[14px] bg-danger/10 px-4 py-3 text-sm text-danger">{t.dash.grouptime.loadError}</p>}

      {/* segmented control สลับมุมมอง */}
      <div className="mb-4 inline-flex rounded-full border border-line bg-card p-1">
        {(["board", "summary"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={[
              "rounded-full px-4 py-1.5 text-sm transition-colors",
              view === v ? "bg-forest font-medium text-white" : "text-muted hover:text-ink",
            ].join(" ")}
          >
            {t.dash.grouptime[v]}
          </button>
        ))}
      </div>

      {groups.length === 0 || checkpoints.length === 0 ? (
        <p className="rounded-[20px] border border-line bg-card px-4 py-10 text-center text-muted">{t.dash.grouptime.noGroups}</p>
      ) : view === "board" ? (
        <StatusBoard
          groups={groups}
          checkpoints={checkpoints}
          visits={gt.store.visits}
          onArrive={gt.recordArrival}
          onDepart={gt.recordDeparture}
          onDetails={setDetailGroup}
        />
      ) : (
        <SummaryView groups={groups} checkpoints={checkpoints} visits={gt.store.visits} />
      )}

      {detailGroup && (
        <GroupDetailModal
          group={detailGroup}
          checkpoints={checkpoints}
          visits={gt.store.visits}
          onUpdate={gt.updateVisit}
          onDelete={gt.deleteVisit}
          onClose={() => setDetailGroup(null)}
        />
      )}
    </section>
  );
}

/* ---------- กระดานสถานะ: แถวละกลุ่ม + ปุ่มเข้า/ออกฐาน ---------- */

function StatusBoard({
  groups,
  checkpoints,
  visits,
  onArrive,
  onDepart,
  onDetails,
}: {
  groups: NotiGroup[];
  checkpoints: Checkpoint[];
  visits: GroupTimeVisit[];
  onArrive: (groupId: number, checkpointId: number) => void;
  onDepart: (groupId: number) => void;
  onDetails: (g: NotiGroup) => void;
}) {
  const t = useT();
  const now = useNow();
  const orderedIds = useMemo(() => checkpoints.map((c) => c.id), [checkpoints]);
  // กันกดรัว: ปิดปุ่มของกลุ่มสั้นๆ หลังกด ไม่ให้เกิด visit ซ้ำจาก double-tap
  const [lockedGroup, setLockedGroup] = useState<number | null>(null);
  function withLock(groupId: number, fn: () => void) {
    if (lockedGroup === groupId) return;
    setLockedGroup(groupId);
    fn();
    window.setTimeout(() => setLockedGroup((g) => (g === groupId ? null : g)), 800);
  }

  return (
    <div className="overflow-hidden rounded-[20px] border border-line bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-4 py-3">{t.dash.grouptime.colGroup}</th>
              <th className="px-4 py-3">{t.dash.grouptime.colStatus}</th>
              <th className="px-4 py-3">{t.dash.grouptime.colElapsed}</th>
              <th className="px-4 py-3">{t.dash.grouptime.colActions}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <BoardRow
                key={g.group_id}
                group={g}
                checkpoints={checkpoints}
                orderedIds={orderedIds}
                visits={visits}
                now={now}
                locked={lockedGroup === g.group_id}
                onArrive={(cpId) => withLock(g.group_id, () => onArrive(g.group_id, cpId))}
                onDepart={() => withLock(g.group_id, () => onDepart(g.group_id))}
                onDetails={() => onDetails(g)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BoardRow({
  group,
  checkpoints,
  orderedIds,
  visits,
  now,
  locked,
  onArrive,
  onDepart,
  onDetails,
}: {
  group: NotiGroup;
  checkpoints: Checkpoint[];
  orderedIds: number[];
  visits: GroupTimeVisit[];
  now: number;
  locked: boolean;
  onArrive: (checkpointId: number) => void;
  onDepart: () => void;
  onDetails: () => void;
}) {
  const t = useT();
  const { lang } = useLang();
  const status = groupStatus(visits, group.group_id);
  const suggested = suggestNextCheckpoint(visits, group.group_id, orderedIds);
  // ฐานที่จะบันทึกเมื่อกด "เข้าฐาน" — default ตามลำดับเส้นทาง แต่เลือกเองได้
  const [targetId, setTargetId] = useState<number | "">("");
  const effectiveTarget = targetId === "" ? suggested : targetId;

  const cpById = useMemo(() => new Map(checkpoints.map((c) => [c.id, c])), [checkpoints]);
  const timeStr = (iso: string) => formatTs(iso, t.dash.locale, timeOpts);

  let statusEl: React.ReactNode;
  let elapsedMs: number | null = null;
  if (status.kind === "idle") {
    statusEl = <span className="rounded-full bg-line/60 px-2.5 py-1 text-xs text-muted">{t.dash.grouptime.statusIdle}</span>;
  } else if (status.kind === "atBase") {
    const cp = cpById.get(status.checkpoint_id);
    elapsedMs = now - Date.parse(status.since);
    statusEl = (
      <span className="rounded-full bg-forest/10 px-2.5 py-1 text-xs text-forest">
        {t.dash.grouptime.statusAtBase(cp ? baseName(cp, lang) : `#${status.checkpoint_id}`, timeStr(status.since))}
      </span>
    );
  } else {
    elapsedMs = now - Date.parse(status.since);
    statusEl = (
      <span className="rounded-full bg-gold/12 px-2.5 py-1 text-xs text-golddeep">
        {t.dash.grouptime.statusWalking(timeStr(status.since))}
      </span>
    );
  }
  const stuck = elapsedMs !== null && elapsedMs > STUCK_MS;

  return (
    <tr className="border-b border-line/70 transition-colors last:border-0 hover:bg-cream/50">
      <td className="px-4 py-3 font-medium text-ink">{t.dash.common.group(group.group_number)}</td>
      <td className="px-4 py-3">{statusEl}</td>
      <td className="px-4 py-3">
        {elapsedMs !== null && (
          <span className={stuck ? "rounded-full bg-danger/12 px-2.5 py-1 text-xs font-medium text-danger" : "text-muted"}>
            {formatDuration(elapsedMs, durLabels(t))}
            {stuck && ` · ${t.dash.grouptime.stuck}`}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <select
            value={effectiveTarget ?? ""}
            onChange={(e) => setTargetId(e.target.value === "" ? "" : Number(e.target.value))}
            className="max-w-[180px] rounded-full border border-line bg-card px-3 py-1.5 text-xs text-ink outline-none transition-colors focus:border-forest"
          >
            {checkpoints.map((c) => (
              <option key={c.id} value={c.id}>
                {c.sequence != null ? `${c.sequence}. ` : ""}{baseName(c, lang)}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={locked || effectiveTarget === null}
            onClick={() => effectiveTarget !== null && onArrive(effectiveTarget)}
            className="rounded-full bg-forest px-4 py-1.5 text-xs font-medium text-white transition-all duration-200 hover:brightness-110 disabled:opacity-50"
          >
            {t.dash.grouptime.arrive}
          </button>
          <button
            type="button"
            disabled={locked || status.kind !== "atBase"}
            onClick={onDepart}
            className="rounded-full border border-line px-4 py-1.5 text-xs text-muted transition-colors hover:border-forest/40 hover:text-forest disabled:opacity-50 disabled:hover:border-line disabled:hover:text-muted"
          >
            {t.dash.grouptime.depart}
          </button>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <button type="button" onClick={onDetails} className="text-xs text-muted underline-offset-2 transition-colors hover:text-forest hover:underline">
          {t.dash.grouptime.details}
        </button>
      </td>
    </tr>
  );
}

/* ---------- ตารางสรุป: กลุ่ม × ฐาน + รวมเวลาเดิน/ในฐาน + เฉลี่ยต่อฐาน ---------- */

function SummaryView({ groups, checkpoints, visits }: { groups: NotiGroup[]; checkpoints: Checkpoint[]; visits: GroupTimeVisit[] }) {
  const t = useT();
  const { lang } = useLang();
  const averages = useMemo(() => perBaseAverages(visits), [visits]);
  const labels = durLabels(t);

  if (visits.length === 0) {
    return <p className="rounded-[20px] border border-line bg-card px-4 py-10 text-center text-muted">{t.dash.grouptime.empty}</p>;
  }

  return (
    <div className="overflow-hidden rounded-[20px] border border-line bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-4 py-3">{t.dash.grouptime.colGroup}</th>
              {checkpoints.map((c) => (
                <th key={c.id} className="px-4 py-3 whitespace-nowrap">
                  {c.sequence != null ? `${c.sequence}. ` : ""}{baseName(c, lang)}
                </th>
              ))}
              <th className="px-4 py-3 whitespace-nowrap">{t.dash.grouptime.colWalkTotal}</th>
              <th className="px-4 py-3 whitespace-nowrap">{t.dash.grouptime.colDwellTotal}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const totals = perGroupTotals(visits, g.group_id);
              return (
                <tr key={g.group_id} className="border-b border-line/70 transition-colors last:border-0 hover:bg-cream/50">
                  <td className="px-4 py-3 font-medium text-ink">{t.dash.common.group(g.group_number)}</td>
                  {checkpoints.map((c) => {
                    const ms = dwellAtBase(visits, g.group_id, c.id);
                    return (
                      <td key={c.id} className="px-4 py-3 text-muted">
                        {ms !== null ? <span className="text-ink">{formatDuration(ms, labels)}</span> : "—"}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-golddeep">{totals.walkMs > 0 ? formatDuration(totals.walkMs, labels) : "—"}</td>
                  <td className="px-4 py-3 text-forest">{totals.dwellMs > 0 ? formatDuration(totals.dwellMs, labels) : "—"}</td>
                </tr>
              );
            })}
            {/* แถวเฉลี่ยต่อฐาน (เฉพาะ visit ที่ปิดแล้ว) */}
            <tr className="bg-cream/60 text-xs">
              <td className="px-4 py-3 font-medium text-forestdeep">{t.dash.grouptime.avgRow}</td>
              {checkpoints.map((c) => {
                const a = averages.get(c.id);
                return (
                  <td key={c.id} className="px-4 py-3 text-muted">
                    {a ? (
                      <>
                        <span className="text-ink">{formatDuration(a.avgMs, labels)}</span>
                        <span className="ml-1">({t.dash.grouptime.groupsPassed(a.count)})</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                );
              })}
              <td className="px-4 py-3" />
              <td className="px-4 py-3" />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- modal รายละเอียดกลุ่ม: timeline + แก้ไข/ลบ visit ---------- */

function GroupDetailModal({
  group,
  checkpoints,
  visits,
  onUpdate,
  onDelete,
  onClose,
}: {
  group: NotiGroup;
  checkpoints: Checkpoint[];
  visits: GroupTimeVisit[];
  onUpdate: (id: string, patch: Partial<Pick<GroupTimeVisit, "arrived_at" | "departed_at">>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const { lang } = useLang();
  const timeline = useMemo(() => groupTimeline(visits, group.group_id), [visits, group.group_id]);
  const totals = useMemo(() => perGroupTotals(visits, group.group_id), [visits, group.group_id]);
  const cpById = useMemo(() => new Map(checkpoints.map((c) => [c.id, c])), [checkpoints]);
  const [editing, setEditing] = useState<GroupTimeVisit | null>(null);
  const labels = durLabels(t);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[26px] bg-card p-7 shadow-[0_30px_80px_-40px_rgba(27,67,50,0.5)]">
        <h3 className="mb-5 text-lg font-semibold text-forestdeep">
          {t.dash.grouptime.heading} · {t.dash.common.group(group.group_number)}
        </h3>

        {timeline.length === 0 && <p className="py-6 text-center text-sm text-muted">{t.dash.grouptime.empty}</p>}

        <ol className="space-y-2">
          {timeline.map((e) =>
            e.kind === "walk" ? (
              <li key={`${e.walk.departed_at}-walk`} className="flex items-center gap-3 pl-1 text-xs text-muted">
                <IconWalk />
                <span>
                  {t.dash.grouptime.walkSegment} · <span className="text-golddeep">{formatDuration(e.walk.ms, labels)}</span>
                </span>
              </li>
            ) : (
              <li key={e.visit.id} className="rounded-[14px] border border-line/80 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {(() => {
                        const cp = cpById.get(e.visit.checkpoint_id);
                        return cp ? baseName(cp, lang) : `#${e.visit.checkpoint_id}`;
                      })()}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatTs(e.visit.arrived_at, t.dash.locale, timeOpts)}
                      {" → "}
                      {e.visit.departed_at ? formatTs(e.visit.departed_at, t.dash.locale, timeOpts) : t.dash.grouptime.stillHere}
                      {e.dwellMs !== null && <span className="ml-2 text-forest">{formatDuration(e.dwellMs, labels)}</span>}
                    </p>
                  </div>
                  <div className="flex flex-none gap-2 text-xs">
                    <button type="button" onClick={() => setEditing(e.visit)} className="text-muted transition-colors hover:text-forest">
                      {t.dash.grouptime.editVisit}
                    </button>
                    <button
                      type="button"
                      onClick={() => window.confirm(t.dash.grouptime.deleteVisitConfirm) && onDelete(e.visit.id)}
                      className="text-muted transition-colors hover:text-danger"
                    >
                      {t.dash.grouptime.deleteVisit}
                    </button>
                  </div>
                </div>
              </li>
            ),
          )}
        </ol>

        {timeline.length > 0 && (
          <div className="mt-5 flex gap-6 border-t border-line pt-4 text-sm">
            <p className="text-muted">
              {t.dash.grouptime.colDwellTotal}: <span className="font-medium text-forest">{formatDuration(totals.dwellMs, labels)}</span>
            </p>
            <p className="text-muted">
              {t.dash.grouptime.colWalkTotal}: <span className="font-medium text-golddeep">{formatDuration(totals.walkMs, labels)}</span>
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-full px-5 py-2.5 text-muted transition-colors hover:text-ink">
            {t.dash.common.cancel}
          </button>
        </div>
      </div>

      {editing && (
        <EditVisitModal
          visit={editing}
          onSave={(patch) => {
            onUpdate(editing.id, patch);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/* แปลง ISO ↔ ค่าใน <input type="datetime-local"> (เวลาท้องถิ่นของเครื่อง admin) */
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputToIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function EditVisitModal({
  visit,
  onSave,
  onClose,
}: {
  visit: GroupTimeVisit;
  onSave: (patch: Partial<Pick<GroupTimeVisit, "arrived_at" | "departed_at">>) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [arrived, setArrived] = useState(() => isoToLocalInput(visit.arrived_at));
  const [departed, setDeparted] = useState(() => (visit.departed_at ? isoToLocalInput(visit.departed_at) : ""));
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    const a = localInputToIso(arrived);
    const d = departed ? localInputToIso(departed) : null;
    if (!a) return;
    if (d && Date.parse(d) < Date.parse(a)) {
      setError(t.dash.grouptime.badRange);
      return;
    }
    onSave({ arrived_at: a, departed_at: d });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-[26px] bg-card p-7 shadow-[0_30px_80px_-40px_rgba(27,67,50,0.5)]">
        <h3 className="mb-5 text-lg font-semibold text-forestdeep">{t.dash.grouptime.editVisit}</h3>
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted">{t.dash.grouptime.arrivedAt}</span>
            <input
              type="datetime-local"
              value={arrived}
              onChange={(e) => setArrived(e.target.value)}
              className="w-full rounded-[14px] border border-line bg-card px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-forest"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted">
              {t.dash.grouptime.departedAt} · {t.dash.grouptime.departedHint}
            </span>
            <input
              type="datetime-local"
              value={departed}
              onChange={(e) => setDeparted(e.target.value)}
              className="w-full rounded-[14px] border border-line bg-card px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-forest"
            />
          </label>
          {error && <p className="rounded-[14px] bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-5 py-2.5 text-muted transition-colors hover:text-ink">
            {t.dash.common.cancel}
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-full bg-forest px-6 py-2.5 font-medium text-white transition-all duration-200 hover:brightness-110"
          >
            {t.dash.common.save}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- ปุ่ม/ไอคอนเล็กๆ ---------- */

function SecondaryButton({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-full border border-line px-4 py-2 text-sm transition-colors disabled:opacity-50",
        danger ? "text-muted hover:border-danger/40 hover:text-danger" : "text-muted hover:border-forest/40 hover:text-forest",
        "disabled:hover:border-line disabled:hover:text-muted",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function IconInfo() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
    </svg>
  );
}
function IconWalk() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="13" cy="5" r="1.6" />
      <path d="M13 8.5 10.5 14l-2 5M13 8.5l2.5 3 2.5 1M13 8.5 10 10l-1.5 3M10.5 14l3 2 1 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
