"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TextField } from "@/components/register/ui";
import { login } from "@/lib/adminApi";
import { useSession, homePathForRole } from "@/lib/session";
import { headingFont, useLang } from "@/lib/i18n/LanguageProvider";

/**
 * ฟอร์มเข้าสู่ระบบที่ใช้ร่วมกันทั้งหน้า participant และ staff — endpoint /auth/login
 * ตัวเดียว · สำเร็จแล้วเด้งไปหน้าของบทบาทตัวเองด้วย homePathForRole()
 * ข้อความ (i18n) ต่างกันตามหน้า จึงรับผ่าน prop `copy` · ลิงก์เสริม (เช่นลิงก์เจ้าหน้าที่)
 * ส่งมาทาง children
 */
export type LoginCopy = {
  eyebrow: string;
  heading: string;
  sub?: string;
  username: string;
  usernameHint?: string;
  password: string;
  signIn: string;
  signingIn: string;
  failed: string;
  noAccount: string;
  registerLink: string;
};

export default function LoginForm({
  copy,
  registerHref,
  children,
}: {
  copy: LoginCopy;
  registerHref: string;
  children?: ReactNode;
}) {
  const { lang } = useLang();
  const router = useRouter();
  const { signIn } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const sess = await login(username.trim(), password);
      signIn(sess);
      router.push(homePathForRole(sess.role));
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="on-dark w-full max-w-sm">
      <header className="mb-7 text-center">
        <p className="text-[10px] uppercase tracking-[0.42em] text-goldsoft sm:text-xs">{copy.eyebrow}</p>
        <h1
          className="mt-4 text-[clamp(1.8rem,4vw,2.6rem)] leading-[1.05] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
          style={headingFont(lang, 1.25)}
        >
          {copy.heading}
        </h1>
        {copy.sub && <p className="mt-3 text-sm text-cream/78">{copy.sub}</p>}
      </header>

      <div className="space-y-5 rounded-[26px] border border-cream/15 bg-ink/82 p-7 shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <TextField
          label={copy.username}
          value={username}
          onChange={setUsername}
          autoComplete="username"
          hint={copy.usernameHint}
        />
        <TextField
          label={copy.password}
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
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
            {busy ? copy.signingIn : copy.signIn}
          </button>
        </div>

        <div className="border-t border-cream/15 pt-5 text-center">
          <p className="text-sm text-cream/78">{copy.noAccount}</p>
          <Link
            href={registerHref}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-goldsoft underline-offset-4 transition-colors hover:text-cream hover:underline"
          >
            {copy.registerLink}
            <svg width="14" height="11" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M1 6h13M9.5 1.5 14 6l-4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
