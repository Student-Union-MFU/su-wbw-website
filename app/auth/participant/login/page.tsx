"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ForestScene from "@/components/ForestScene";
import LoginForm from "@/components/auth/LoginForm";
import { useSession, homePathForRole } from "@/lib/session";
import { useT } from "@/lib/i18n/LanguageProvider";
import { DAY_STILL } from "@/lib/dayCycle";

/**
 * /auth/participant/login — เข้าสู่ระบบผู้เข้าร่วม (ฉากป่า + การ์ดกระจก เหมือนหน้าโปรไฟล์)
 * ล็อกอินอยู่แล้ว → เด้งไปหน้าของบทบาทตัวเอง · มีลิงก์ไปฝั่งเจ้าหน้าที่
 */
export default function ParticipantLoginPage() {
  const t = useT();
  const router = useRouter();
  const { session, ready } = useSession();
  const L = t.dash.login;

  useEffect(() => {
    if (ready && session) router.replace(homePathForRole(session.role));
  }, [ready, session, router]);

  return (
    <>
      <ForestScene day={DAY_STILL} focus="center" />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-24">
        <LoginForm
          copy={{
            eyebrow: t.dash.brand,
            heading: L.heading,
            sub: L.sub,
            username: L.username,
            usernameHint: L.usernameHint,
            password: L.password,
            signIn: L.signIn,
            signingIn: L.signingIn,
            failed: L.failed,
            noAccount: L.noAccount,
            registerLink: L.registerLink,
            forgot: t.passwordReset.forgotLink,
          }}
          registerHref="/auth/participant/register"
        >
          <div className="mt-4 border-t border-cream/12 pt-4">
            <p className="text-sm text-cream/70">{L.staffPrompt}</p>
            <div className="mt-1.5 flex items-center justify-center gap-4 text-sm">
              <Link
                href="/auth/staff/login"
                className="font-semibold text-cream/85 underline-offset-4 transition-colors hover:text-cream hover:underline"
              >
                {L.staffLoginLink}
              </Link>
              <span className="text-cream/25">·</span>
              <Link
                href="/auth/staff/register"
                className="font-semibold text-cream/85 underline-offset-4 transition-colors hover:text-cream hover:underline"
              >
                {L.staffRegisterLink}
              </Link>
            </div>
          </div>
        </LoginForm>
      </main>
    </>
  );
}
