"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createNotification,
  getSentNotifications,
  getGroups,
  getSchools,
  getParticipants,
  getDraft,
  saveDraft,
  clearDraft,
  getPresets,
  savePreset,
  deletePreset,
  type Audience,
  type NotiLevel,
  type SentNotification,
  type NotiGroup,
  type School,
  type Participant,
  type NotiPreset,
} from "@/lib/adminApi";
import { useRef } from "react";
import { SelectField, TextField } from "@/components/register/ui";
import { useT } from "@/lib/i18n/LanguageProvider";
import { formatTs } from "@/lib/datetime";
import type { Dict } from "@/lib/i18n/dictionaries";

/* ป้ายและสีตามระดับความสำคัญ (info เขียว, warning ทอง, emergency แดง) */
const levels = (t: Dict): { value: NotiLevel; label: string; chip: string; dot: string }[] => [
  { value: "info", label: t.dash.announce.levelInfo, chip: "bg-forest/10 text-forest", dot: "bg-forest" },
  { value: "warning", label: t.dash.announce.levelWarning, chip: "bg-gold/12 text-gold", dot: "bg-gold" },
  { value: "emergency", label: t.dash.announce.levelEmergency, chip: "bg-danger/12 text-danger", dot: "bg-danger" },
];

const audienceOptions = (t: Dict): { value: Audience; label: string }[] => [
  { value: "all", label: t.dash.announce.audAllOption },
  { value: "group", label: t.dash.announce.audGroupOption },
  { value: "school", label: t.dash.announce.audSchoolOption },
  { value: "user", label: t.dash.announce.audUserOption },
];
const audienceLabel = (t: Dict): Record<Audience, string> => ({
  all: t.dash.announce.audAll,
  group: t.dash.announce.audGroup,
  school: t.dash.announce.audSchool,
  user: t.dash.announce.audUser,
});

const fmtTime = (iso: string, locale: string) => formatTs(iso, locale);

export function Announcements({ token }: { token: string }) {
  const t = useT();
  const [sent, setSent] = useState<SentNotification[]>([]);
  const [loading, setLoading] = useState(true);

  function reload() {
    getSentNotifications(token).then(setSent).catch(() => setSent([])).finally(() => setLoading(false));
  }
  useEffect(reload, [token]);

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-forestdeep">{t.dash.announce.heading}</h2>
        <p className="mt-1 text-sm text-muted">{t.dash.announce.sub}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
        <Composer token={token} onSent={reload} />
        <SentList sent={sent} loading={loading} />
      </div>
    </section>
  );
}

/* ---------- ฟอร์มเขียนประกาศ ---------- */
function Composer({ token, onSent }: { token: string; onSent: () => void }) {
  const t = useT();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState<NotiLevel>("info");
  const [audience, setAudience] = useState<Audience>("all");
  const [audienceId, setAudienceId] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [presets, setPresets] = useState<NotiPreset[]>([]);
  const loaded = useRef(false);

  // โหลดร่างค้าง + preset ตอนเปิด
  useEffect(() => {
    getDraft(token).then((d) => {
      if (d) {
        setTitle(d.title ?? "");
        setBody(d.body ?? "");
        setLevel(d.level);
        setAudience(d.audience);
        setAudienceId(d.audience_id ?? "");
      }
      loaded.current = true;
    });
    getPresets(token).then(setPresets);
  }, [token]);

  // auto-save ร่าง (debounce) เมื่อแก้ · ว่างหมด = ลบร่าง
  useEffect(() => {
    if (!loaded.current) return;
    const empty = !title.trim() && !body.trim() && audience === "all" && level === "info";
    const t = setTimeout(() => {
      if (empty) clearDraft(token);
      else saveDraft(token, { title, body, level, audience, audience_id: audience === "all" ? null : audienceId });
    }, 800);
    return () => clearTimeout(t);
  }, [token, title, body, level, audience, audienceId]);

  function loadPreset(p: NotiPreset) {
    setTitle(p.title ?? "");
    setBody(p.body ?? "");
    setLevel(p.level);
    setAudience(p.audience);
    setAudienceId(p.audience_id ?? "");
    setOk(false);
  }
  async function doSavePreset() {
    const name = window.prompt(t.dash.announce.presetPrompt);
    if (!name || !name.trim()) return;
    try {
      await savePreset(token, { name: name.trim(), title, body, level, audience, audience_id: audience === "all" ? null : audienceId });
      setPresets(await getPresets(token));
    } catch { /* เงียบ */ }
  }
  async function doDeletePreset(id: number) {
    await deletePreset(token, id);
    setPresets((ps) => ps.filter((p) => p.id !== id));
  }

  // เปลี่ยนกลุ่มเป้าหมาย → ล้างค่าที่เลือกไว้เดิม
  function changeAudience(a: string) {
    setAudience(a as Audience);
    setAudienceId("");
  }

  async function submit() {
    setError(null);
    setOk(false);
    if (!title.trim()) { setError(t.dash.announce.titleRequired); return; }
    if (audience !== "all" && !audienceId) { setError(t.dash.announce.audienceRequired); return; }
    setBusy(true);
    try {
      await createNotification(token, {
        title: title.trim(),
        body: body.trim() || undefined,
        level,
        audience,
        audience_id: audience === "all" ? null : audienceId,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      // เคลียร์ฟอร์ม + ลบร่าง (ส่งแล้วไม่ค้าง)
      setTitle(""); setBody(""); setLevel("info"); setAudience("all"); setAudienceId(""); setExpiresAt("");
      setOk(true);
      clearDraft(token);
      onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.dash.announce.sendFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-fit rounded-[20px] border border-line bg-card p-5">
      <div className="space-y-4">
        {/* preset — กดโหลด / ลบ / บันทึกใหม่ */}
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-xs text-ink">
              <button type="button" onClick={() => loadPreset(p)} className="transition-colors hover:text-forest">{p.name}</button>
              <button type="button" onClick={() => doDeletePreset(p.id)} className="text-muted transition-colors hover:text-danger">✕</button>
            </span>
          ))}
          <button
            type="button"
            onClick={doSavePreset}
            className="rounded-full border border-dashed border-forest/45 px-3 py-1 text-xs text-forest transition-colors hover:bg-forest/5"
          >
            {t.dash.announce.savePreset}
          </button>
        </div>

        <TextField label={t.dash.announce.title} value={title} onChange={(v) => { setTitle(v); setOk(false); }} placeholder={t.dash.announce.titlePlaceholder} maxLength={120} />

        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">{t.dash.announce.body}</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder={t.dash.announce.bodyPlaceholder}
            className="w-full resize-none rounded-[14px] border border-line bg-card px-4 py-3 text-ink outline-none transition-all duration-200 placeholder:text-muted/70 focus:border-forest focus:ring-2 focus:ring-forest/15"
          />
        </label>

        {/* ระดับความสำคัญ — segmented */}
        <div>
          <span className="mb-1.5 block text-sm text-muted">{t.dash.announce.level}</span>
          <div className="flex gap-2">
            {levels(t).map((l) => {
              const active = level === l.value;
              return (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLevel(l.value)}
                  className={[
                    "flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-sm transition-all duration-200",
                    active ? `${l.chip} border-transparent font-medium` : "border-line text-muted hover:text-ink",
                  ].join(" ")}
                >
                  <span className={`h-2 w-2 rounded-full ${l.dot}`} />
                  {l.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* กลุ่มเป้าหมาย */}
        <SelectField label={t.dash.announce.sendTo} value={audience} onChange={changeAudience} options={audienceOptions(t)} />

        {audience === "group" && <GroupPicker token={token} value={audienceId} onChange={setAudienceId} />}
        {audience === "school" && <SchoolPicker token={token} value={audienceId} onChange={setAudienceId} />}
        {audience === "user" && <UserPicker token={token} value={audienceId} onChange={setAudienceId} />}

        <TextField label={t.dash.announce.expires} value={expiresAt} onChange={setExpiresAt} type="datetime-local" />

        {error && <p className="rounded-[14px] bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
        {ok && <p className="rounded-[14px] bg-forest/10 px-4 py-3 text-sm text-forest">{t.dash.announce.sent}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="w-full rounded-full bg-forest px-6 py-3 font-medium text-white transition-all duration-200 hover:brightness-110 disabled:opacity-60"
        >
          {busy ? t.dash.announce.sending : t.dash.announce.send}
        </button>
      </div>
    </div>
  );
}

/* เลือกกลุ่ม */
function GroupPicker({ token, value, onChange }: { token: string; value: string; onChange: (v: string) => void }) {
  const t = useT();
  const [groups, setGroups] = useState<NotiGroup[]>([]);
  useEffect(() => { getGroups(token).then(setGroups).catch(() => setGroups([])); }, [token]);
  const options = groups.map((g) => ({ value: String(g.group_id), label: t.dash.common.group(g.group_number) }));
  return <SelectField label={t.dash.announce.selectGroup} value={value} onChange={onChange} options={options} placeholder={t.dash.announce.selectGroup} />;
}

/* เลือกสำนักวิชา */
function SchoolPicker({ token, value, onChange }: { token: string; value: string; onChange: (v: string) => void }) {
  const t = useT();
  const [schools, setSchools] = useState<School[]>([]);
  useEffect(() => { getSchools(token).then(setSchools).catch(() => setSchools([])); }, [token]);
  const options = schools.map((s) => ({ value: String(s.school_id), label: s.name }));
  return <SelectField label={t.dash.announce.selectSchool} value={value} onChange={onChange} options={options} placeholder={t.dash.announce.selectSchool} />;
}

/* ค้นหาและเลือกผู้เข้าร่วมรายคน */
function UserPicker({ token, value, onChange }: { token: string; value: string; onChange: (v: string) => void }) {
  const t = useT();
  const [people, setPeople] = useState<Participant[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => { getParticipants(token).then(setPeople).catch(() => setPeople([])); }, [token]);

  const selected = people.find((p) => p.id === value);
  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return people
      .filter((p) => {
        const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`.toLowerCase();
        return name.includes(term) || String(p.bib ?? "").includes(term) || (p.student_id ?? "").includes(term);
      })
      .slice(0, 8);
  }, [q, people]);

  if (selected) {
    return (
      <div>
        <span className="mb-1.5 block text-sm text-muted">{t.dash.announce.recipient}</span>
        <div className="flex items-center justify-between rounded-[14px] border border-forest/40 bg-forest/5 px-4 py-3">
          <span className="text-sm text-ink">
            {selected.first_name} {selected.last_name}
            {selected.bib != null && <span className="text-muted"> · BIB {selected.bib}</span>}
          </span>
          <button type="button" onClick={() => { onChange(""); setQ(""); }} className="text-sm text-muted transition-colors hover:text-danger">
            {t.dash.announce.change}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TextField label={t.dash.announce.searchRecipient} value={q} onChange={setQ} placeholder={t.dash.announce.searchRecipientPlaceholder} />
      {matches.length > 0 && (
        <ul className="mt-2 overflow-hidden rounded-[14px] border border-line bg-card">
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => { onChange(p.id); setQ(""); }}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-ink transition-colors hover:bg-forest/5"
              >
                <span>{p.first_name} {p.last_name}</span>
                <span className="text-xs text-muted">{p.bib != null ? `BIB ${p.bib}` : p.student_id}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- รายการประกาศที่ส่งแล้ว ---------- */
function SentList({ sent, loading }: { sent: SentNotification[]; loading: boolean }) {
  const t = useT();
  const levelMap = Object.fromEntries(levels(t).map((l) => [l.value, l]));
  return (
    <div className="overflow-hidden rounded-[20px] border border-line bg-card">
      <div className="border-b border-line/70 px-4 py-3">
        <h3 className="text-sm font-medium text-forestdeep">{t.dash.announce.sentList}</h3>
      </div>
      {loading ? (
        <p className="px-4 py-10 text-center text-muted">{t.dash.common.loading}</p>
      ) : sent.length === 0 ? (
        <p className="px-4 py-10 text-center text-muted">{t.dash.announce.noneSent}</p>
      ) : (
        <ul>
          {sent.map((n) => {
            const lv = levelMap[n.level] ?? levelMap.info;
            return (
              <li key={n.id} className="border-b border-line/70 px-4 py-3.5 last:border-0">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 flex-none rounded-full px-2.5 py-1 text-xs ${lv.chip}`}>{lv.label}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}
                    <p className="mt-1 text-xs text-muted">
                      {t.dash.announce.sentTo} {audienceLabel(t)[n.audience]}
                      {n.audience !== "all" && n.audience_id ? ` ${n.audience_id}` : ""}
                      {" · "}{t.dash.announce.read} {Number(n.read_count)}/{Number(n.delivered_count)}
                      {n.creator_name ? ` · ${t.dash.common.by(n.creator_name)}` : ""}
                    </p>
                  </div>
                  <span className="flex-none text-xs text-muted">{fmtTime(n.created_at, t.dash.locale)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
