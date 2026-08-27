"use client";

import { useState } from "react";
import Link from "next/link";
import ForestScene from "@/components/ForestScene";
import { TextField } from "@/components/register/ui";
import { requestPasswordReset } from "@/lib/adminApi";
import { headingFont, useLang } from "@/lib/i18n/LanguageProvider";
import { DAY_STILL } from "@/lib/dayCycle";

/**
 * /auth/forgot — ขอลิงก์ตั้งรหัสผ่านใหม่ทางอีเมล
 *
 * หน้าเดียวใช้ได้ทั้งผู้เข้าร่วมและเจ้าหน้าที่ เพราะ backend รับ "ชื่อผู้ใช้" ช่องเดียว
 * แล้วไปหาอีเมลปลายทางเอง (ผู้เข้าร่วมคำนวณจากรหัสนักศึกษา เจ้าหน้าที่ใช้อีเมลที่
 * กรอกตอนสมัคร) ฝั่งนี้จึงไม่ต้องรู้ว่าคนกรอกเป็นบทบาทไหน
 *
 * ⚠ หน้าจอ "ส่งแล้ว" ขึ้นทุกครั้งที่ backend ตอบ 200 ซึ่งมันตอบ 200 แม้ไม่มีบัญชีนั้น
 * อยู่จริง — ตั้งใจให้แยกไม่ออก ข้อความจึงต้องเป็น "ถ้ามีบัญชีนี้อยู่..." เสมอ
 * (ดู requestPasswordReset ใน lib/adminApi.ts)
 */
export default function ForgotPasswordPage() {
  const { t, lang } = useLang();
  const c = t.passwordReset.forgot;

  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    const name = username.trim();
    if (!name) {
      setError(c.errUsername);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await requestPasswordReset(name);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : c.failed);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <>
        <ForestScene day={DAY_STILL} focus="center" />
        <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-24">
          <div className="on-dark w-full max-w-md rounded-[26px] border border-cream/15 bg-ink/82 p-8 text-center shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-gold" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 7.5 12 13l9-5.5" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="3" y="5" width="18" height="14" rx="2.5" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-cream">{c.sentHeading}</h1>
            <p className="mt-2 text-cream/78">{c.sentBody}</p>
            <p className="mt-4 text-sm leading-relaxed text-cream/72">{c.sentNote}</p>
            <p className="mt-3 text-sm leading-relaxed text-cream/60">{c.staffNote}</p>
            <Link
              href="/auth/participant/login"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-cream px-7 py-3 text-sm font-semibold text-forestdeep transition-transform duration-300 hover:scale-[1.03]"
            >
              {c.backToLogin}
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <ForestScene day={DAY_STILL} focus="center" />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-24">
        <div className="on-dark w-full max-w-sm">
          <header className="mb-7 text-center">
            <p className="text-[10px] uppercase tracking-[0.42em] text-goldsoft sm:text-xs">
              {t.passwordReset.eyebrow}
            </p>
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
              label={c.username}
              value={username}
              onChange={setUsername}
              autoComplete="username"
              hint={c.usernameHint}
            />
            {error && (
              <p className="rounded-[14px] border border-danger/40 bg-danger/20 px-4 py-3 text-sm text-[#ffc4c4]">
                {error}
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
                href="/auth/participant/login"
                className="text-sm font-semibold text-goldsoft underline-offset-4 transition-colors hover:text-cream hover:underline"
              >
                {c.backToLogin}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
