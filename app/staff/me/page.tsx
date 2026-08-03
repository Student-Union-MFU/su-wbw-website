"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ForestScene from "@/components/ForestScene";
import { useSession, homePathForRole } from "@/lib/session";
import { headingFont, useLang } from "@/lib/i18n/LanguageProvider";
import { DAY_STILL } from "@/lib/dayCycle";

/**
 * /staff/me — หน้าเจ้าหน้าที่หลังเข้าสู่ระบบ (โครงขั้นต้น ยังไม่มีเครื่องมือ)
 *
 * เจ้าหน้าที่ไม่มีโปรไฟล์แบบผู้เข้าร่วม (GET /wbw/me คืน 404) เลยแสดงแค่ชื่อผู้ใช้ + บทบาท
 * · ยังไม่ล็อกอิน → /staff/login · บทบาทอื่น → หน้าของบทบาทตัวเอง
 */
export default function StaffMePage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const { session, ready, signOut } = useSession();

  const wrongRole = ready && (!session || session.role !== "staff");
  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace("/auth/staff/login");
    else if (session.role !== "staff") router.replace(homePathForRole(session.role));
  }, [ready, session, router]);

  if (!ready || wrongRole) return null;

  const initial = (session!.username || "?").charAt(0).toUpperCase();

  return (
    <>
      <ForestScene day={DAY_STILL} focus="center" />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-24">
        <div className="w-full max-w-md">
          <header className="text-center">
            <p className="text-[10px] uppercase tracking-[0.42em] text-goldsoft sm:text-xs">
              {t.dash.me.eyebrow}
            </p>
            <h1
              className="mt-4 text-[clamp(1.8rem,4vw,2.6rem)] leading-[1.05] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
              style={headingFont(lang, 1.25)}
            >
              {t.dash.me.heading}
            </h1>
          </header>

          <div className="mt-7 rounded-[26px] border border-cream/15 bg-ink/82 p-7 text-left shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-full border border-cream/20 bg-cream/10 text-xl font-bold text-cream/80">
                {initial}
              </span>
              <div className="min-w-0">
                <div className="truncate text-lg font-bold text-cream">{session!.username}</div>
                <span className="mt-1 inline-block rounded-full border border-gold/40 bg-gold/15 px-2.5 py-0.5 text-xs font-semibold text-cream">
                  {t.dash.users.roleStaff}
                </span>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/landing"
                className="rounded-full bg-cream px-7 py-3 text-center text-sm font-semibold text-forestdeep transition-all duration-200 hover:-translate-y-0.5 hover:bg-white"
              >
                {t.dash.me.toLanding}
              </Link>
              <button
                type="button"
                onClick={() => {
                  signOut();
                  router.replace("/landing");
                }}
                className="rounded-full border border-cream/30 px-7 py-3 text-sm font-medium text-cream/78 transition-colors hover:border-cream/60 hover:text-cream"
              >
                {t.dash.me.signOut}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
