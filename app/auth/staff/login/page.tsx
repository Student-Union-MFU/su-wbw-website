"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ForestScene from "@/components/ForestScene";
import NavBar from "@/components/landing/NavBar";
import LoginForm from "@/components/auth/LoginForm";
import { useSession, homePathForRole } from "@/lib/session";
import { useT } from "@/lib/i18n/LanguageProvider";
import { DAY_STILL } from "@/lib/dayCycle";

/**
 * /auth/staff/login — เข้าสู่ระบบเจ้าหน้าที่และผู้ดูแล (endpoint /auth/login กลางตัวเดียว)
 * สำเร็จ → เด้งไปหน้าของบทบาทตัวเอง (staff → /staff/me · admin → /dashboard)
 * บัญชีที่ยังไม่อนุมัติจะได้ error 403 จาก backend
 */
export default function StaffLoginPage() {
  const t = useT();
  const router = useRouter();
  const { session, ready } = useSession();
  const s = t.staffAuth.login;

  useEffect(() => {
    if (ready && session) router.replace(homePathForRole(session.role));
  }, [ready, session, router]);

  return (
    <>
      <ForestScene day={DAY_STILL} focus="center" />
      <NavBar />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-24">
        <LoginForm
          copy={{
            eyebrow: t.staffAuth.eyebrow,
            heading: s.heading,
            sub: s.sub,
            username: s.username,
            password: s.password,
            signIn: s.signIn,
            signingIn: s.signingIn,
            failed: s.failed,
            noAccount: s.noAccount,
            registerLink: s.registerLink,
          }}
          registerHref="/auth/staff/register"
        />
      </main>
    </>
  );
}
