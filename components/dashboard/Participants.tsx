"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getParticipants,
  patchParticipant,
  getParticipantDetail,
  resetParticipantPassword,
  deleteParticipant,
  getGroups,
  type Participant,
  type ParticipantDetail,
  type NotiGroup,
} from "@/lib/adminApi";
import { getSchools, type School } from "@/lib/api";
import { MAJORS_BY_SCHOOL } from "@/components/register/mfu-data";
import { SelectField, TextField } from "@/components/register/ui";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { Dict } from "@/lib/i18n/dictionaries";
import { PHONE_RE, STUDENT_ID_RE, digitsOnly } from "@/lib/validation";
import { formatTs } from "@/lib/datetime";

// มีแค่ "ไม่ทราบ" ที่ต้องแปล — ที่เหลือเป็นสัญลักษณ์
const bloodOptions = (t: Dict) => [
  { value: "O+", label: "O+" },
  { value: "O-", label: "O−" },
  { value: "A+", label: "A+" },
  { value: "A-", label: "A−" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B−" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB−" },
  { value: "unknown", label: t.dash.participants.bloodUnknown },
];
const bloodLabel = (v: string | null, t: Dict) =>
  v ? (v === "unknown" ? t.dash.participants.bloodUnknown : v.replace("-", "−")) : "—";
const sexOptions = (t: Dict) => [
  { value: "male", label: t.dash.participants.male },
  { value: "female", label: t.dash.participants.female },
  { value: "unspecified", label: t.dash.participants.unspecified },
];
// ป้ายชื่อของแต่ละ action · ค่าที่ backend ส่งมาเป็นภาษาอังกฤษคงที่ (join/leave/quota_adjust)
// ตั้งใจ — ถ้าส่งเป็นข้อความไทยมา หน้าเว็บจะแปลเป็นภาษาอังกฤษไม่ได้เลย
const ACTION_LABEL = (t: Dict) => ({
  join: t.dash.participants.actionJoin,
  leave: t.dash.participants.actionLeave,
  quota_adjust: t.dash.participants.actionAdjust,
});

export function Participants({ token }: { token: string }) {
  const t = useT();
  const [rows, setRows] = useState<Participant[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [groups, setGroups] = useState<NotiGroup[]>([]);
  const [q, setQ] = useState("");
  const [schoolFilter, setSchoolFilter] = useState(""); // "" = ทุกสำนักวิชา
  const [quotaZeroOnly, setQuotaZeroOnly] = useState(false); // คำถามจริงของ admin คือ "ใครติดล็อกบ้าง"
  const [editing, setEditing] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSchools().then(setSchools).catch(() => setSchools([]));
    getGroups(token).then(setGroups).catch(() => setGroups([]));
    getParticipants(token)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (schoolFilter && String(r.school_id) !== schoolFilter) return false;
      if (quotaZeroOnly && r.leave_quota !== 0) return false;
      if (!s) return true;
      return `${r.first_name ?? ""} ${r.last_name ?? ""} ${r.student_id}`.toLowerCase().includes(s);
    });
  }, [rows, q, schoolFilter, quotaZeroOnly]);

  function onSaved(updated: Participant) {
    setRows((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
    setEditing(null);
  }
  function onDeleted(id: string) {
    setRows((rs) => rs.filter((r) => r.id !== id));
    setEditing(null);
  }

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-forestdeep">
          {t.dash.participants.heading} <span className="text-sm font-normal text-muted">({rows.length})</span>
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-72">
            <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="9" cy="9" r="6" />
              <path d="m14 14 3 3" strokeLinecap="round" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.dash.participants.search}
              className="w-full rounded-full border border-line bg-card py-2.5 pl-11 pr-4 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-forest"
            />
          </div>
          <select
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            className="rounded-full border border-line bg-card px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-forest sm:w-56"
          >
            <option value="">{t.dash.participants.allSchools}</option>
            {schools.map((s) => (
              <option key={s.school_id} value={String(s.school_id)}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setQuotaZeroOnly((v) => !v)}
            aria-pressed={quotaZeroOnly}
            className={`rounded-full border px-4 py-2.5 text-sm transition-colors ${
              quotaZeroOnly
                ? "border-danger bg-danger/12 text-danger"
                : "border-line bg-card text-muted hover:text-ink"
            }`}
          >
            {t.dash.participants.quotaZeroOnly}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-line bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">BIB</th>
                <th className="px-4 py-3 font-medium">{t.dash.participants.colName}</th>
                <th className="px-4 py-3 font-medium">{t.dash.participants.colStudentId}</th>
                <th className="px-4 py-3 font-medium">{t.dash.participants.colSchool}</th>
                <th className="px-4 py-3 font-medium">{t.dash.participants.colMajor}</th>
                <th className="px-4 py-3 font-medium">{t.dash.participants.colGroup}</th>
                <th className="px-4 py-3 font-medium">{t.dash.participants.colPhone}</th>
                <th className="px-4 py-3 font-medium">{t.dash.participants.colBlood}</th>
                <th className="px-4 py-3 font-medium">{t.dash.participants.colCheckin}</th>
                <th className="px-4 py-3 font-medium">{t.dash.participants.colQuota}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-muted">{t.dash.common.loading}</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-muted">
                    {t.dash.participants.emptyBefore}{" "}
                    <a href="/auth/participant/register" className="text-forest underline hover:text-forestdeep">
                      {t.dash.participants.emptyLink}
                    </a>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-muted">{t.dash.participants.noMatch}</td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-b border-line/70 transition-colors last:border-0 hover:bg-cream/50">
                    <td className="px-4 py-3 text-muted">{r.bib ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-ink">{`${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "—"}</td>
                    <td className="px-4 py-3 text-ink">{r.student_id}</td>
                    <td className="px-4 py-3 text-muted">{r.school_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{r.major ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{r.group_number != null ? t.dash.common.group(r.group_number) : "—"}</td>
                    <td className="px-4 py-3 text-muted">{r.contact_phone || "—"}</td>
                    <td className="px-4 py-3 text-muted">{bloodLabel(r.blood_type, t)}</td>
                    <td className="px-4 py-3">
                      <CheckinBadge on={r.checked_in} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          r.leave_quota === 0 ? "bg-danger/12 text-danger" : "bg-forest/10 text-forest"
                        }`}
                      >
                        {r.leave_quota}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setEditing(r)}
                        className="rounded-full px-3 py-1.5 text-sm text-forest transition-colors hover:bg-forest/8"
                      >
                        {t.dash.common.edit}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditModal
          token={token}
          participant={editing}
          schools={schools}
          groups={groups}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      )}
    </section>
  );
}

function CheckinBadge({ on }: { on: boolean }) {
  const t = useT();
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs",
        on ? "bg-forest/10 text-forest" : "bg-line/60 text-muted",
      ].join(" ")}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-forest" : "bg-muted"}`} />
      {on ? t.dash.participants.isCheckedIn : t.dash.participants.notCheckedIn}
    </span>
  );
}

/* ---------- modal แก้ไขผู้เข้าร่วม ---------- */
function EditModal({
  token,
  participant,
  schools,
  groups,
  onClose,
  onSaved,
  onDeleted,
}: {
  token: string;
  participant: Participant;
  schools: School[];
  groups: NotiGroup[];
  onClose: () => void;
  onSaved: (p: Participant) => void;
  onDeleted: (id: string) => void;
}) {
  const t = useT();
  const [detail, setDetail] = useState<ParticipantDetail | null>(null);
  const [form, setForm] = useState({
    student_id: participant.student_id,
    first_name: participant.first_name ?? "",
    last_name: participant.last_name ?? "",
    sex: participant.sex ?? "",
    date_of_birth: "",
    contact_phone: participant.contact_phone ?? "",
    school_id: participant.school_id ? String(participant.school_id) : "",
    major: participant.major ?? "",
    group_id: participant.group_id ? String(participant.group_id) : "",
    blood_type: participant.blood_type ?? "",
    weight_kg: "",
    height_cm: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    checked_in: participant.checked_in,
    leave_quota: String(participant.leave_quota ?? 0),
  });
  // ค่าที่ backend มีจริง (ไม่ใช่ค่าที่ผู้ใช้กำลังพิมพ์) — ใช้เทียบตอน save()
  // ว่า admin แก้โควตาจริงไหม ก่อนตัดสินใจว่าจะส่ง leave_quota ไปด้วยหรือไม่
  const [loadedQuota, setLoadedQuota] = useState(participant.leave_quota ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // รหัสผ่าน
  const [newPw, setNewPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  // ลบ
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    getParticipantDetail(token, participant.id)
      .then((d) => {
        setDetail(d);
        setForm((f) => ({
          ...f,
          sex: d.sex ?? "",
          date_of_birth: d.date_of_birth ?? "",
          major: d.major ?? "",
          group_id: d.group_id ? String(d.group_id) : "",
          weight_kg: d.weight_kg != null ? String(d.weight_kg) : "",
          height_cm: d.height_cm != null ? String(d.height_cm) : "",
          emergency_contact_name: d.emergency_contact_name ?? "",
          emergency_contact_phone: d.emergency_contact_phone ?? "",
          leave_quota: String(d.leave_quota),
        }));
        setLoadedQuota(d.leave_quota);
      })
      .catch(() => {});
  }, [token, participant.id]);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const schoolName = schools.find((s) => String(s.school_id) === form.school_id)?.name ?? "";
  const majorOptions = (MAJORS_BY_SCHOOL[schoolName] ?? []).map((m) => ({ value: m, label: m }));

  async function save() {
    setError(null);
    if (!STUDENT_ID_RE.test(form.student_id)) {
      setError(t.dash.participants.badStudentId);
      return;
    }
    // เช็คเฉพาะรูปแบบ ไม่บังคับกรอก — ข้อมูลเก่าอาจว่าง ต้องไม่บล็อกการแก้ field อื่น
    if (form.contact_phone && !PHONE_RE.test(form.contact_phone)) {
      setError(t.dash.participants.badPhone);
      return;
    }
    if (form.emergency_contact_phone && !PHONE_RE.test(form.emergency_contact_phone)) {
      setError(t.dash.participants.badEmergencyPhone);
      return;
    }
    const quota = Number(form.leave_quota);
    // เช็คฝั่งนี้ด้วยแม้ backend จะเช็คอยู่แล้ว — ผู้ใช้ควรเห็นข้อความทันทีที่พิมพ์ผิด
    // ไม่ต้องรอ round trip แล้วได้ error กลับมาแบบไม่ผูกกับช่องไหน
    // Number("") === 0 ไม่ใช่ NaN — ถ้าช่องว่างต้องนับเป็นค่าไม่ถูกต้อง ไม่ใช่ "ตั้งสิทธิ์เป็น 0"
    if (form.leave_quota.trim() === "" || !Number.isInteger(quota) || quota < 0 || quota > 10) {
      setError(t.dash.participants.quotaRange);
      return;
    }
    setBusy(true);
    try {
      const updated = await patchParticipant(token, participant.id, {
        student_id: form.student_id,
        first_name: form.first_name,
        last_name: form.last_name,
        sex: form.sex || undefined,
        date_of_birth: form.date_of_birth || undefined,
        contact_phone: form.contact_phone,
        school_id: form.school_id ? Number(form.school_id) : undefined,
        major: form.major || undefined,
        group_id: form.group_id ? Number(form.group_id) : undefined,
        blood_type: form.blood_type,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
        height_cm: form.height_cm ? Number(form.height_cm) : undefined,
        emergency_contact_name: form.emergency_contact_name || undefined,
        emergency_contact_phone: form.emergency_contact_phone || undefined,
        checked_in: form.checked_in,
        // ส่ง leave_quota เฉพาะตอนค่าเปลี่ยนจริงเท่านั้น — backend มองว่า "มีคีย์นี้ในคำขอ"
        // แปลว่า admin ตั้งใจปรับสิทธิ์ แล้วจะเขียนแถว admin_log + group_membership_log
        // (quota_adjust) ทุกครั้ง ต่อให้ค่าที่ส่งเท่ากับของเดิม ถ้าส่งไปเฉย ๆ ทุกครั้งที่ save:
        // 1) โควตาที่เพิ่งถูกใช้ไป (ลดลงฝั่ง backend ระหว่างที่ modal เปิดค้างอยู่ หรือตอนที่
        //    detail fetch ล้มเหลวเงียบ ๆ แล้ว form ยังถือค่าเก่าจาก list) จะถูก COALESCE ทับคืน
        //    กลายเป็นสิทธิ์ฟรีที่ไม่ควรได้ และ audit log จะโทษ admin ทั้งที่ไม่ได้ตั้งใจแก้
        // 2) membership_log เก็บแค่ 10 แถวล่าสุด การแก้ช่องอื่น (เบอร์โทร, เช็คอิน ฯลฯ) ซ้ำ ๆ
        //    จะไล่ประวัติเข้า/ออกกลุ่มจริงตกขอบ ทั้งที่เป็นสิ่งที่ admin เปิดจอนี้มาดูโดยตรง
        ...(quota !== loadedQuota ? { leave_quota: quota } : {}),
      });
      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.dash.common.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  async function resetPw() {
    setPwMsg(null);
    if (newPw.length < 8) {
      setPwMsg(t.dash.participants.pwTooShort);
      return;
    }
    try {
      await resetParticipantPassword(token, participant.id, newPw);
      setPwMsg(t.dash.participants.resetOk);
      setNewPw("");
    } catch (e) {
      setPwMsg(e instanceof Error ? e.message : t.dash.participants.resetFailed);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteParticipant(token, participant.id);
      onDeleted(participant.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.dash.common.deleteFailed);
      setBusy(false);
    }
  }

  const groupOptions = groups
    .slice()
    .sort((a, b) => a.group_number - b.group_number)
    .map((g) => ({ value: String(g.group_id), label: t.dash.common.group(g.group_number) }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[26px] bg-card p-7 shadow-[0_30px_80px_-40px_rgba(27,67,50,0.5)]">
        <h3 className="mb-1 text-lg font-semibold text-forestdeep">{t.dash.participants.editTitle}</h3>
        <p className="mb-5 text-xs text-muted">
          BIB {participant.bib ?? "—"} · {t.dash.participants.registeredOn} {detail?.created?.slice(0, 10) ?? "—"}
        </p>

        <div className="space-y-4">
          {/* ข้อมูลส่วนตัว */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label={t.dash.participants.firstName} value={form.first_name} onChange={set("first_name")} />
            <TextField label={t.dash.participants.lastName} value={form.last_name} onChange={set("last_name")} />
          </div>
          <TextField
            label={t.dash.participants.studentId}
            value={form.student_id}
            onChange={(v) => set("student_id")(digitsOnly(v))}
            inputMode="numeric"
            maxLength={10}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField label={t.dash.participants.sex} value={form.sex} onChange={set("sex")} placeholder={t.dash.participants.sexPlaceholder} options={sexOptions(t)} />
            <TextField label={t.dash.participants.birthdate} type="date" value={form.date_of_birth} onChange={set("date_of_birth")} />
          </div>

          {/* สำนัก / สาขา / กลุ่ม */}
          <SelectField
            label={t.dash.participants.school}
            value={form.school_id}
            onChange={(v) => setForm((f) => ({ ...f, school_id: v ?? "", major: "" }))}
            placeholder={t.dash.participants.schoolPlaceholder}
            options={schools.map((s) => ({ value: String(s.school_id), label: s.name }))}
          />
          {majorOptions.length > 0 && (
            <SelectField label={t.dash.participants.major} value={form.major} onChange={set("major")} placeholder={t.dash.participants.majorPlaceholder} options={majorOptions} />
          )}
          <SelectField
            label={t.dash.participants.group}
            value={form.group_id}
            onChange={set("group_id")}
            placeholder={t.dash.participants.noGroup}
            options={groupOptions}
          />
          <TextField
            label={t.dash.participants.quotaLabel}
            value={form.leave_quota}
            onChange={set("leave_quota")}
            type="number"
            min={0}
            max={10}
            step={1}
          />

          {/* ประวัติเข้า/ออกกลุ่ม — อยู่ติดกับช่องโควตา ไม่ใช่ฝังอยู่ใต้การ์ดยินยอมอีกต่อไป
              เพราะคำถามจริงของ admin ที่เปิด modal นี้คือ "ทำไมคนนี้ออกกลุ่มไม่ได้" */}
          {detail && (
            <div className="rounded-[16px] bg-cream/60 p-4 text-xs text-muted">
              <h4 className="text-sm font-semibold text-forestdeep">
                {t.dash.participants.historyHeading}
              </h4>
              {detail.membership_log.length === 0 ? (
                <p className="mt-2 text-sm text-muted">{t.dash.participants.historyEmpty}</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {detail.membership_log.map((l, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span
                        className={`mt-0.5 flex-none rounded-full px-2.5 py-1 text-xs ${
                          l.action === "leave" ? "bg-danger/12 text-danger" : "bg-forest/10 text-forest"
                        }`}
                      >
                        {ACTION_LABEL(t)[l.action] ?? l.action}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-ink">
                          {l.group_number != null ? `${t.dash.participants.colGroup} ${l.group_number}` : "—"}
                          {" · "}
                          {t.dash.participants.colQuota} {l.quota_after}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {l.actor_name
                            ? t.dash.participants.historyBy(l.actor_name)
                            : t.dash.participants.historySelf}
                        </p>
                      </div>
                      <span className="flex-none text-xs text-muted">
                        {formatTs(l.created_at, t.dash.locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ติดต่อ / สุขภาพ */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label={t.dash.participants.phone} value={form.contact_phone} onChange={(v) => set("contact_phone")(digitsOnly(v))} inputMode="tel" />
            <SelectField label={t.dash.participants.blood} value={form.blood_type} onChange={set("blood_type")} placeholder={t.dash.participants.bloodPlaceholder} options={bloodOptions(t)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label={t.dash.participants.weight} value={form.weight_kg} onChange={(v) => set("weight_kg")(v.replace(/[^\d.]/g, ""))} inputMode="numeric" />
            <TextField label={t.dash.participants.height} value={form.height_cm} onChange={(v) => set("height_cm")(v.replace(/[^\d.]/g, ""))} inputMode="numeric" />
          </div>

          {/* ฉุกเฉิน */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label={t.dash.participants.emergencyName} value={form.emergency_contact_name} onChange={set("emergency_contact_name")} />
            <TextField label={t.dash.participants.emergencyPhone} value={form.emergency_contact_phone} onChange={(v) => set("emergency_contact_phone")(digitsOnly(v))} inputMode="tel" />
          </div>

          {/* เช็คอิน */}
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, checked_in: !f.checked_in }))}
            className={[
              "flex w-full items-center gap-3 rounded-[16px] border p-4 text-left transition-all duration-200",
              form.checked_in ? "border-forest bg-forest/5" : "border-line bg-card hover:border-forest/40",
            ].join(" ")}
          >
            <span className={["flex h-5 w-5 flex-none items-center justify-center rounded-md border", form.checked_in ? "border-forest bg-forest" : "border-line bg-card"].join(" ")}>
              {form.checked_in && (
                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m5 10.5 3.5 3.5L15 6.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="text-sm text-ink">{t.dash.participants.markCheckedIn}</span>
          </button>

          {/* ข้อมูลยินยอม (อ่านอย่างเดียว) */}
          {detail && (
            <div className="rounded-[16px] bg-cream/60 p-4 text-xs text-muted">
              <p className="mb-2 font-medium text-forestdeep">{t.dash.participants.consentTitle}</p>
              <div className="flex flex-wrap gap-2">
                <ConsentTag ok={detail.consent_health_data} label={t.dash.participants.consentHealth} />
                <ConsentTag ok={detail.consent_emergency_treatment} label={t.dash.participants.consentEmergency} />
                <ConsentTag ok={detail.waiver_accepted} label={t.dash.participants.consentWaiver} />
              </div>
            </div>
          )}

          {error && <p className="rounded-[14px] bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-5 py-2.5 text-muted transition-colors hover:text-ink">
            {t.dash.common.cancel}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-full bg-forest px-6 py-2.5 font-medium text-white transition-all duration-200 hover:brightness-110 disabled:opacity-60"
          >
            {busy ? t.dash.common.saving : t.dash.common.save}
          </button>
        </div>

        {/* รีเซ็ตรหัสผ่าน */}
        <div className="mt-6 border-t border-line pt-5">
          <p className="mb-1 text-sm font-medium text-forestdeep">{t.dash.participants.resetTitle}</p>
          <p className="mb-3 text-xs text-muted">{t.dash.participants.resetHint}</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showPw ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder={t.dash.participants.newPwPlaceholder}
                autoComplete="new-password"
                className="w-full rounded-[14px] border border-line bg-card py-2.5 pl-4 pr-11 text-sm text-ink outline-none focus:border-forest"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-forest"
              >
                {showPw ? t.dash.participants.hide : t.dash.participants.show}
              </button>
            </div>
            <button
              type="button"
              onClick={resetPw}
              className="flex-none rounded-[14px] border border-forest px-4 py-2.5 text-sm font-medium text-forest transition-colors hover:bg-forest/8"
            >
              {t.dash.participants.reset}
            </button>
          </div>
          {pwMsg && <p className="mt-2 text-xs text-forest">{pwMsg}</p>}
        </div>

        {/* ลบ */}
        <div className="mt-6 border-t border-line pt-5">
          {!confirmDel ? (
            <button
              type="button"
              onClick={() => setConfirmDel(true)}
              className="text-sm text-danger transition-colors hover:underline"
            >
              {t.dash.participants.deleteThis}
            </button>
          ) : (
            <div className="rounded-[14px] bg-danger/8 p-4">
              <p className="text-sm text-danger">{t.dash.participants.deleteWarn}</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setConfirmDel(false)} className="rounded-full px-4 py-2 text-sm text-muted hover:text-ink">
                  {t.dash.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={remove}
                  disabled={busy}
                  className="rounded-full bg-danger px-5 py-2 text-sm font-medium text-white hover:bg-danger/90 disabled:opacity-60"
                >
                  {busy ? t.dash.participants.deleting : t.dash.participants.deleteForever}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConsentTag({ ok, label }: { ok: boolean | null; label: string }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
        ok ? "bg-forest/10 text-forest" : "bg-line/60 text-muted",
      ].join(" ")}
    >
      {ok ? "✓" : "✕"} {label}
    </span>
  );
}
