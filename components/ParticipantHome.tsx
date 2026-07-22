"use client";

import { useEffect, useState, type ReactNode } from "react";
import ForestScene from "@/components/ForestScene";
import Link from "next/link";
import NavBar from "@/components/landing/NavBar";
import { getMyProfile, type MyProfile } from "@/lib/adminApi";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { DAY_STILL } from "@/lib/dayCycle";

/**
 * หน้าของผู้เข้าร่วมหลังเข้าสู่ระบบ (route /me)
 *
 * ดึงโปรไฟล์จริงจาก backend (GET /api/me → /wbw/me) ด้วย token ของตัวเอง
 * ทำงานทุกเครื่อง ไม่ต้องพึ่งแคชในเครื่อง · endpoint คืน model.ParticipantDetail
 */


export default function ParticipantHome({
  token,
  studentId,
  onLogout,
}: {
  token: string;
  studentId: string;
  onLogout: () => void;
}) {
  const { t, lang } = useLang();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getMyProfile(token)
      .then((p) => alive && setProfile(p))
      .catch((e: Error) => {
        if (!alive) return;
        if (e.message === "unauthorized") onLogout();
        else setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [token, onLogout]);

  const na = t.dash.me.notProvided;
  const fullName = profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() : "";
  const sexLabel = (v: string | null) =>
    v === "male" ? t.step1.male : v === "female" ? t.step1.female : v === "unspecified" ? t.step1.unspecified : na;
  const num = (v: number | null, unit: string) => (v != null ? `${v} ${unit}` : na);

  return (
    <>
      <ForestScene day={DAY_STILL} focus="center" />
      <NavBar />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-24">
        <div className="w-full max-w-md">
          <header className="text-center">
            <p className="text-[10px] uppercase tracking-[0.42em] text-goldsoft sm:text-xs">
              {t.dash.me.eyebrow}
            </p>
            <h1
              className="mt-4 text-[clamp(1.8rem,4vw,2.6rem)] leading-[1.05] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
              style={{ fontFamily: lang === "th" ? "var(--font-hand-th)" : "var(--font-hand)" }}
            >
              {t.dash.me.heading}
            </h1>
          </header>

          <div className="mt-7 rounded-[26px] border border-cream/15 bg-ink/82 p-7 text-left shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            {/* avatar + ชื่อ + รหัสนักศึกษา */}
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-full border border-cream/20 bg-cream/10 text-cream/80">
                {profile?.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <circle cx="12" cy="8.5" r="3.5" />
                    <path d="M4.5 19c1.5-3.5 4.2-5 7.5-5s6 1.5 7.5 5" strokeLinecap="round" />
                  </svg>
                )}
              </span>
              <div className="min-w-0">
                {fullName && <div className="truncate text-lg font-bold text-cream">{fullName}</div>}
                <div className="text-[11px] uppercase tracking-[0.14em] text-cream/60">
                  {t.dash.me.studentIdLabel}
                </div>
                <div className="text-[18px] font-extrabold tracking-[0.5px] text-goldsoft">
                  {profile?.student_id ?? studentId}
                </div>
              </div>
              {profile?.bib != null && (
                <span className="ml-auto flex-none rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-semibold text-cream">
                  BIB {profile.bib}
                </span>
              )}
            </div>

            {error ? (
              <p className="mt-6 rounded-[14px] border border-danger/40 bg-danger/20 px-4 py-3 text-sm text-[#ffc4c4]">
                {error}
              </p>
            ) : !profile ? (
              <p className="mt-6 animate-pulse text-sm text-cream/60">…</p>
            ) : (
              <div className="mt-6 space-y-5 border-t border-cream/12 pt-5">
                <Section title={t.dash.me.academicTitle}>
                  <Row label={t.step1.school} value={profile.school_name || na} />
                  <Row label={t.dash.me.majorLabel} value={profile.major || na} />
                </Section>

                <Section title={t.dash.me.personalTitle}>
                  <Row label={t.dash.me.sexLabel} value={sexLabel(profile.sex)} />
                  <Row label={t.dash.me.phoneLabel} value={profile.contact_phone || na} />
                  <Row label={t.dash.me.birthdateLabel} value={profile.date_of_birth || na} />
                </Section>

                <Section title={t.dash.me.medicalTitle}>
                  <Row label={t.dash.me.weightLabel} value={num(profile.weight_kg, "kg")} />
                  <Row label={t.dash.me.heightLabel} value={num(profile.height_cm, "cm")} />
                  <Row label={t.dash.me.bloodLabel} value={profile.blood_type || na} />
                </Section>

                {(profile.emergency_contact_name || profile.emergency_contact_phone) && (
                  <Section title={t.dash.me.emergencyTitle}>
                    <Row label={t.step4.name} value={profile.emergency_contact_name || na} />
                    <Row label={t.dash.me.phoneLabel} value={profile.emergency_contact_phone || na} />
                  </Section>
                )}
              </div>
            )}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/landing"
                className="rounded-full bg-cream px-7 py-3 text-center text-sm font-semibold text-forestdeep transition-all duration-200 hover:-translate-y-0.5 hover:bg-white"
              >
                {t.dash.me.toLanding}
              </Link>
              <button
                type="button"
                onClick={onLogout}
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-goldsoft">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="flex-none text-cream/60">{label}</dt>
      <dd className="text-right font-medium text-cream">{value}</dd>
    </div>
  );
}
