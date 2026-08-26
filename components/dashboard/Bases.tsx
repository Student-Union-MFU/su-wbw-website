"use client";

import { useEffect, useMemo, useState } from "react";
import {
  assignStaff,
  createCheckpoint,
  deleteCheckpoint,
  getCheckpoints,
  getUsers,
  patchCheckpoint,
  unassignStaff,
  type AdminUser,
  type Checkpoint,
} from "@/lib/adminApi";
import { SelectField, TextField } from "@/components/register/ui";
import { useLang, useT } from "@/lib/i18n/LanguageProvider";
import type { Dict } from "@/lib/i18n/dictionaries";

/** ชื่อฐานตามภาษาปัจจุบัน — ไม่มีคำแปลอังกฤษ → fall back เป็นไทย */
const baseName = (b: { name: string; name_en: string | null }, lang: string) =>
  lang === "en" && b.name_en ? b.name_en : b.name;

const typeLabels = (t: Dict): Record<string, string> => ({
  activity: t.dash.bases.typeActivity,
  restroom: t.dash.bases.typeRestroom,
  welfare: t.dash.bases.typeWelfare,
  recreation: t.dash.bases.typeRecreation,
  service: t.dash.bases.typeService,
});

export function Bases({ token }: { token: string }) {
  const t = useT();
  const [bases, setBases] = useState<Checkpoint[]>([]);
  const [staff, setStaff] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingTo, setAddingTo] = useState<number | null>(null);
  const [modal, setModal] = useState<{ type: "create" } | { type: "edit"; base: Checkpoint } | { type: "delete"; base: Checkpoint } | null>(null);

  function reload() {
    getCheckpoints(token).then(setBases).catch(() => setBases([])).finally(() => setLoading(false));
  }
  useEffect(() => {
    reload();
    getUsers(token).then(setStaff).catch(() => setStaff([]));
  }, [token]);

  async function assign(cpId: number, userId: string) {
    setAddingTo(null);
    await assignStaff(token, cpId, userId).catch(() => {});
    reload();
  }
  async function remove(cpId: number, userId: string) {
    await unassignStaff(token, cpId, userId).catch(() => {});
    reload();
  }

  if (loading) return <p className="text-muted">{t.dash.common.loading}</p>;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-forestdeep">{t.dash.bases.heading}</h2>
          <p className="mt-1 text-sm text-muted">{t.dash.bases.sub}</p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ type: "create" })}
          className="rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110"
        >
          {t.dash.bases.add}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {bases.map((b) => (
          <BaseCard
            key={b.id}
            base={b}
            allStaff={staff}
            adding={addingTo === b.id}
            onOpenAdd={() => setAddingTo(addingTo === b.id ? null : b.id)}
            onAssign={(uid) => assign(b.id, uid)}
            onRemove={(uid) => remove(b.id, uid)}
            onEdit={() => setModal({ type: "edit", base: b })}
            onDelete={() => setModal({ type: "delete", base: b })}
          />
        ))}
      </div>

      {(modal?.type === "create" || modal?.type === "edit") && (
        <CheckpointModal
          token={token}
          base={modal.type === "edit" ? modal.base : undefined}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); reload(); }}
        />
      )}
      {modal?.type === "delete" && (
        <DeleteBaseModal token={token} base={modal.base} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />
      )}
    </section>
  );
}

function BaseCard({
  base,
  allStaff,
  adding,
  onOpenAdd,
  onAssign,
  onRemove,
  onEdit,
  onDelete,
}: {
  base: Checkpoint;
  allStaff: AdminUser[];
  adding: boolean;
  onOpenAdd: () => void;
  onAssign: (userId: string) => void;
  onRemove: (userId: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t, lang } = useLang();
  const assignedIds = new Set(base.staff.map((s) => s.id));
  const available = useMemo(() => allStaff.filter((u) => !assignedIds.has(u.id)), [allStaff, base.staff]);

  return (
    <div className="rounded-[20px] border border-line bg-card p-5">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-forest/10 text-sm font-bold text-forest">
          {base.sequence ?? "•"}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-ink">{baseName(base, lang)}</h3>
          <p className="text-xs text-muted">{typeLabels(t)[base.type] ?? base.type}</p>
        </div>
        <div className="flex flex-none gap-1">
          <IconButton onClick={onEdit} label={t.dash.common.edit}>
            <path d="M4 13.5V16h2.5l7.4-7.4-2.5-2.5L4 13.5ZM13.6 5.6l1-1a1 1 0 0 1 1.4 0l1 1a1 1 0 0 1 0 1.4l-1 1-2.4-2.4Z" />
          </IconButton>
          <IconButton onClick={onDelete} label={t.dash.common.delete} danger>
            <path d="M6 7h8M8 7V5.5A1.5 1.5 0 0 1 9.5 4h1A1.5 1.5 0 0 1 12 5.5V7m1 0v8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7" />
          </IconButton>
        </div>
      </div>

      {/* ตัวเลขหน้างานของฐานนี้ — คำถามที่คนเปิดแท็บนี้ถามระหว่างงานคือ "ฐานไหน
          คนแน่น ฐานไหนยังไม่มีใครไปถึง ฐานไหนคนบ่น" ซึ่งเดิมหน้านี้ตอบไม่ได้เลย
          ต้องไปเปิดแท็บอื่นแล้วจำชื่อฐานกลับมาเทียบเอง

          คะแนนขึ้นเป็นขีดเมื่อยังไม่มีใครตอบ ไม่ใช่ 0.0 — ฐานที่ไม่มีข้อมูลกับ
          ฐานที่ได้ศูนย์ดาวต้องอ่านออกว่าต่างกัน */}
      <div className="mb-3 grid grid-cols-3 gap-2 rounded-2xl border border-line/70 bg-cream/40 p-3">
        <Metric label={t.dash.bases.mCheckins} value={base.checkin_count} />
        <Metric
          label={t.dash.bases.mRating}
          value={base.avg_rating == null ? "—" : base.avg_rating.toFixed(1)}
          sub={base.feedback_count > 0 ? t.dash.insights.answers(base.feedback_count) : undefined}
        />
        <Metric label={t.dash.bases.mSOS} value={base.sos_count} alert={base.sos_count > 0} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {base.staff.length === 0 && !adding && <span className="text-sm text-muted">{t.dash.bases.noStaff}</span>}
        {base.staff.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full bg-forest/10 py-1 pl-3 pr-1.5 text-sm text-forest">
            {s.display_name || s.username}
            <button type="button" onClick={() => onRemove(s.id)} className="flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-forest/15" aria-label={t.dash.bases.removeStaff}>
              <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" />
              </svg>
            </button>
          </span>
        ))}

        {adding ? (
          available.length > 0 ? (
            <select autoFocus defaultValue="" onChange={(e) => e.target.value && onAssign(e.target.value)} className="rounded-full border border-forest bg-card px-3 py-1.5 text-sm text-ink outline-none">
              <option value="" disabled>{t.dash.bases.selectStaff}</option>
              {available.map((u) => <option key={u.id} value={u.id}>{u.display_name || u.username}</option>)}
            </select>
          ) : (
            <span className="text-sm text-muted">{t.dash.bases.noAvailableStaff}</span>
          )
        ) : (
          <button type="button" onClick={onOpenAdd} className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1 text-sm text-muted transition-colors hover:border-forest/50 hover:text-forest">
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 5v10M5 10h10" strokeLinecap="round" /></svg>
            {t.dash.bases.addStaff}
          </button>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, sub, alert }: { label: string; value: number | string; sub?: string; alert?: boolean }) {
  return (
    <div className="text-center">
      <p className={`text-lg font-semibold tabular-nums ${alert ? "text-danger" : "text-ink"}`}>{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
      {sub && <p className="text-[10px] text-muted/70">{sub}</p>}
    </div>
  );
}

function IconButton({ children, onClick, label, danger }: { children: React.ReactNode; onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={["flex h-8 w-8 items-center justify-center rounded-full transition-colors", danger ? "text-muted hover:bg-danger/8 hover:text-danger" : "text-muted hover:bg-forest/8 hover:text-forest"].join(" ")}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}

/* create + edit ฐาน */
function CheckpointModal({ token, base, onClose, onDone }: { token: string; base?: Checkpoint; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const editing = !!base;
  const [name, setName] = useState(base?.name ?? "");
  const [nameEn, setNameEn] = useState(base?.name_en ?? "");
  const [type, setType] = useState(base?.type ?? "activity");
  const [sequence, setSequence] = useState(base?.sequence != null ? String(base.sequence) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!name.trim()) { setError(t.dash.bases.nameRequired); return; }
    setBusy(true);
    try {
      const seq = sequence === "" ? null : Number(sequence);
      const en = nameEn.trim() || null;
      if (editing) await patchCheckpoint(token, base!.id, { name: name.trim(), name_en: en, type, sequence: seq });
      else await createCheckpoint(token, { name: name.trim(), name_en: en, type, sequence: seq });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.dash.common.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={editing ? t.dash.bases.editTitle : t.dash.bases.add} onClose={onClose}>
      <div className="space-y-4">
        <TextField label={t.dash.bases.name} value={name} onChange={setName} placeholder={t.dash.bases.namePlaceholder} />
        <TextField label={t.dash.bases.nameEn} value={nameEn} onChange={setNameEn} placeholder={t.dash.bases.nameEnPlaceholder} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField label={t.dash.bases.type} value={type} onChange={setType} options={Object.entries(typeLabels(t)).map(([value, label]) => ({ value, label }))} />
          <TextField label={t.dash.bases.sequence} value={sequence} onChange={(v) => setSequence(v.replace(/\D/g, ""))} inputMode="numeric" />
        </div>
        {error && <p className="rounded-[14px] bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      </div>
      <ModalActions onClose={onClose} onSave={save} busy={busy} saveLabel={editing ? t.dash.common.save : t.dash.bases.add} />
    </Modal>
  );
}

function DeleteBaseModal({ token, base, onClose, onDone }: { token: string; base: Checkpoint; onClose: () => void; onDone: () => void }) {
  const { t, lang } = useLang();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function confirm() {
    setBusy(true); setError(null);
    try {
      await deleteCheckpoint(token, base.id);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.dash.common.deleteFailed);
      setBusy(false);
    }
  }
  return (
    <Modal title={t.dash.bases.deleteTitle} onClose={onClose}>
      <p className="text-ink">{t.dash.bases.deleteConfirmBefore} <span className="font-medium">{baseName(base, lang)}</span>{t.dash.bases.deleteConfirmAfter}</p>
      {error && <p className="mt-4 rounded-[14px] bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      <ModalActions onClose={onClose} onSave={confirm} busy={busy} saveLabel={t.dash.bases.deleteTitle} danger />
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-[26px] bg-card p-7 shadow-[0_30px_80px_-40px_rgba(27,67,50,0.5)]">
        <h3 className="mb-5 text-lg font-semibold text-forestdeep">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onClose, onSave, busy, saveLabel, danger }: { onClose: () => void; onSave: () => void; busy: boolean; saveLabel: string; danger?: boolean }) {
  const t = useT();
  return (
    <div className="mt-6 flex justify-end gap-2">
      <button type="button" onClick={onClose} className="rounded-full px-5 py-2.5 text-muted transition-colors hover:text-ink">{t.dash.common.cancel}</button>
      <button type="button" onClick={onSave} disabled={busy} className={["rounded-full px-6 py-2.5 font-medium text-white transition-all duration-200 disabled:opacity-60", danger ? "bg-danger hover:brightness-95" : "bg-forest hover:brightness-110"].join(" ")}>
        {busy ? t.dash.common.saving : saveLabel}
      </button>
    </div>
  );
}
