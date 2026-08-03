"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ForestScene from "@/components/ForestScene";
import NavBar from "@/components/landing/NavBar";
import { SelectField, TextField } from "@/components/register/ui";
import { MAJORS_BY_SCHOOL, SCHOOLS, SCHOOLS_BY_NAME, STAFF_ROLES } from "@/components/register/mfu-data";
import { registerStaff } from "@/lib/adminApi";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { DAY_STILL } from "@/lib/dayCycle";

/**
 * /staff/register — เจ้าหน้าที่สมัครเอง
 * (username + รหัสผ่าน + สำนักวิชา/สาขา + หน้าที่ในงาน)
 * ส่งคำขอแล้วขึ้นหน้า "รออนุมัติ" · ผู้ดูแลอนุมัติในแผงก่อนถึงจะล็อกอินได้
 * สไตล์เดียวกับหน้าเข้าสู่ระบบ (ฉากป่านิ่ง + การ์ดกระจกเข้ม)
 */
export default function StaffRegisterPage() {
  const { t, lang } = useLang();
  const s = t.staffAuth.register;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [major, setMajor] = useState("");
  const [staffRole, setStaffRole] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const schoolOptions = useMemo(
    () => SCHOOLS_BY_NAME.map((sc) => ({ value: String(sc.school_id), label: sc.name })),
    [],
  );
  const schoolName = useMemo(
    () => SCHOOLS.find((sc) => String(sc.school_id) === schoolId)?.name ?? "",
    [schoolId],
  );
  const majorOptions = useMemo(
    () => (MAJORS_BY_SCHOOL[schoolName] ?? []).map((m) => ({ value: m, label: m })),
    [schoolName],
  );
  const roleOptions = useMemo(
    () => STAFF_ROLES.map((r) => ({ value: r, label: s.roles[r] ?? r })),
    [s],
  );

  // เปลี่ยนสำนัก → รีเซ็ตสาขา (รายการสาขาผูกกับสำนัก)
  function onSchool(v: string) {
    setSchoolId(v);
    setMajor("");
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!username.trim()) e.username = s.errUsername;
    if (password.length < 8) e.password = s.errPassword;
    if (confirm !== password) e.confirm = s.errConfirm;
    if (!schoolId) e.schoolId = s.errSchool;
    if (schoolId && majorOptions.length > 0 && !major) e.major = s.errMajor;
    if (!staffRole) e.staffRole = s.errStaffRole;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setBusy(true);
    setSubmitError(null);
    try {
      await registerStaff({
        username: username.trim(),
        password,
        school_id: Number(schoolId),
        major: major || undefined,
        staff_role: staffRole,
      });
      setDone(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : s.failed);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <>
        <ForestScene day={DAY_STILL} focus="center" />
        <NavBar />
        <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-24">
          <div className="on-dark w-full max-w-md rounded-[26px] border border-cream/15 bg-ink/82 p-8 text-center shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-gold" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-cream">{s.pendingHeading}</h1>
            <p className="mt-2 text-cream/78">{s.pendingBody(username.trim())}</p>
            <p className="mt-4 text-sm leading-relaxed text-cream/72">{s.pendingNote}</p>
            <Link
              href="/auth/staff/login"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-cream px-7 py-3 text-sm font-semibold text-forestdeep transition-transform duration-300 hover:scale-[1.03]"
            >
              {s.backToLogin}
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <ForestScene day={DAY_STILL} focus="center" />
      <NavBar />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-24">
        <div className="on-dark w-full max-w-md">
          <header className="mb-7 text-center">
            <p className="text-[10px] uppercase tracking-[0.42em] text-goldsoft sm:text-xs">{t.staffAuth.eyebrow}</p>
            <h1
              className="mt-4 text-[clamp(1.8rem,4vw,2.6rem)] leading-[1.05] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
              style={{ fontFamily: lang === "th" ? "var(--font-hand-th)" : "var(--font-hand)" }}
            >
              {s.heading}
            </h1>
            <p className="mt-3 text-sm text-cream/78">{s.sub}</p>
          </header>

          <div className="space-y-5 rounded-[26px] border border-cream/15 bg-ink/82 p-7 shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            <TextField
              label={s.username}
              value={username}
              onChange={setUsername}
              autoComplete="username"
              hint={s.usernameHint}
              required
              error={errors.username}
            />
            <TextField
              label={s.password}
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              hint={s.passwordHint}
              required
              error={errors.password}
            />
            <TextField
              label={s.confirmPassword}
              type="password"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              required
              error={errors.confirm}
            />

            <SelectField
              label={s.school}
              value={schoolId}
              onChange={onSchool}
              placeholder={s.schoolPlaceholder}
              options={schoolOptions}
              required
              error={errors.schoolId}
            />

            {schoolId && majorOptions.length > 0 && (
              <SelectField
                label={s.major}
                value={major}
                onChange={setMajor}
                placeholder={s.majorPlaceholder}
                options={majorOptions}
                required
                error={errors.major}
              />
            )}

            <SelectField
              label={s.staffRole}
              value={staffRole}
              onChange={setStaffRole}
              placeholder={s.staffRolePlaceholder}
              options={roleOptions}
              hint={s.staffRoleHint}
              required
              error={errors.staffRole}
            />

            {submitError && (
              <p className="rounded-[14px] border border-danger/40 bg-danger/20 px-4 py-3 text-sm text-[#ffc4c4]">
                {submitError}
              </p>
            )}

            <div className="pt-1">
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="w-full rounded-full bg-cream py-3 font-semibold text-forestdeep transition-all duration-200 hover:bg-card disabled:opacity-60"
              >
                {busy ? s.submitting : s.submit}
              </button>
            </div>

            <div className="border-t border-cream/15 pt-5 text-center">
              <p className="text-sm text-cream/78">{s.haveAccount}</p>
              <Link
                href="/auth/staff/login"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-goldsoft underline-offset-4 transition-colors hover:text-cream hover:underline"
              >
                {s.loginLink}
                <svg width="14" height="11" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M1 6h13M9.5 1.5 14 6l-4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
