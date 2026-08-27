"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ForestScene from "@/components/ForestScene";
import { TextField } from "@/components/register/ui";
import { resetPassword } from "@/lib/adminApi";
import { headingFont, useLang } from "@/lib/i18n/LanguageProvider";
import { DAY_STILL } from "@/lib/dayCycle";

/**
 * /auth/reset?token=… — ปลายทางของลิงก์ในอีเมล
 *
 * ตั๋วในลิงก์เป็นตัวบอกว่าเป็นบัญชีของใคร หน้านี้จึงใช้ได้ทั้งผู้เข้าร่วมและเจ้าหน้าที่
 * โดยไม่ต้องรู้บทบาท และไม่ต้องล็อกอินก่อน
 *
 * ตั้งรหัสสำเร็จแล้ว backend ไม่คืน token ให้ (ตั้งใจ) — จบที่หน้า "เรียบร้อย"
 * พร้อมลิงก์ไปหน้าเข้าสู่ระบบ ไม่ได้พาเข้าระบบให้เอง
 */
export default function ResetPasswordPage() {
  // useSearchParams บังคับให้ต้นไม้ใต้มันเป็น client-side render — ห่อ Suspense ไว้
  // ตามที่เอกสาร Next กำหนด ไม่งั้น build จะเตือน/พังตอน prerender หน้านี้
  return (
    <Suspense fallback={<ForestScene day={DAY_STILL} focus="center" />}>
      <ResetPasswordView />
    </Suspense>
  );
}

function ResetPasswordView() {
  const { t, lang } = useLang();
  const c = t.passwordReset.reset;
  const token = useSearchParams().get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (password.length < 8) e.password = c.errPassword;
    if (confirm !== password) e.confirm = c.errConfirm;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setBusy(true);
    setSubmitError(null);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : c.failed);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Shell>
        <div className="on-dark w-full max-w-md rounded-[26px] border border-cream/15 bg-ink/82 p-8 text-center shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-gold" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-cream">{c.doneHeading}</h1>
          <p className="mt-2 text-cream/78">{c.doneBody}</p>
          <Link
            href="/auth/participant/login"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-cream px-7 py-3 text-sm font-semibold text-forestdeep transition-transform duration-300 hover:scale-[1.03]"
          >
            {c.goLogin}
          </Link>
        </div>
      </Shell>
    );
  }

  // ลิงก์ที่ถูกตัดตอนคัดลอก หรือเปิด /auth/reset ตรง ๆ — ไม่มีอะไรให้กรอก
  // บอกให้ไปขอใบใหม่ ดีกว่าปล่อยให้กรอกจนจบแล้วค่อยได้ 400
  if (!token) {
    return (
      <Shell>
        <div className="on-dark w-full max-w-md rounded-[26px] border border-cream/15 bg-ink/82 p-8 text-center shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          <h1 className="text-2xl font-bold text-cream">{c.heading}</h1>
          <p className="mt-3 text-sm leading-relaxed text-cream/78">{c.missingToken}</p>
          <Link
            href="/auth/forgot"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-cream px-7 py-3 text-sm font-semibold text-forestdeep transition-transform duration-300 hover:scale-[1.03]"
          >
            {c.requestNew}
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="on-dark w-full max-w-sm">
        <header className="mb-7 text-center">
          <p className="text-[10px] uppercase tracking-[0.42em] text-goldsoft sm:text-xs">{t.passwordReset.eyebrow}</p>
          <h1
            className="mt-4 text-[clamp(1.8rem,4vw,2.6rem)] leading-[1.05] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
            style={headingFont(lang, 1.25)}
          >
            {c.heading}
          </h1>
          <p className="mt-3 text-sm text-cream/78">{c.sub}</p>
        </header>

        <div className="space-y-5 rounded-[26px] border border-cream/15 bg-ink/82 p-7 shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          <TextField
            label={c.password}
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            hint={c.passwordHint}
            error={errors.password}
          />
          <TextField
            label={c.confirmPassword}
            type="password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            error={errors.confirm}
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
              {busy ? c.submitting : c.submit}
            </button>
          </div>

          <div className="border-t border-cream/15 pt-5 text-center">
            <Link
              href="/auth/forgot"
              className="text-sm font-semibold text-goldsoft underline-offset-4 transition-colors hover:text-cream hover:underline"
            >
              {c.requestNew}
            </Link>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ForestScene day={DAY_STILL} focus="center" />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-24">{children}</main>
    </>
  );
}
