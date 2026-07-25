"use client";

import ForestScene from "@/components/ForestScene";
import Link from "next/link";
import NavBar from "@/components/landing/NavBar";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { DAY_STILL } from "@/lib/dayCycle";


export default function AboutPage() {
  const { t, lang } = useLang();
  return (
    <>
      <ForestScene day={DAY_STILL} focus="center" />
      <NavBar />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 pb-24 pt-28 sm:pt-32">
        <header className="text-center">
          <p className="text-[10px] uppercase tracking-[0.42em] text-goldsoft sm:text-xs">
            {t.about.eyebrow}
          </p>
          <h1
            // EN = แบรนด์ "Walk Beyond the Wild" → Patrick Hand · TH = "เดินรอบดอย"
            // → Itim (Patrick Hand ไม่มี glyph ไทย เลยตกไป fallback ถ้าไม่สลับ)
            className="mt-4 text-[clamp(2.2rem,6vw,4rem)] leading-[1.02] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
            style={{ fontFamily: lang === "th" ? "var(--font-hand-th)" : "var(--font-hand)" }}
          >
            {t.about.heading}
          </h1>
          <p
            // ข้อความรอง = Itim ทั้ง EN/TH → ขนาดตรงกัน ไม่ดู "บีบ" แบบ Patrick Hand
            className="mx-auto mt-4 max-w-lg text-base text-cream/85"
            style={{ fontFamily: "var(--font-hand-th)" }}
          >
            {t.about.lead}
          </p>
        </header>

        <div className="mt-9 rounded-[26px] border border-cream/15 bg-ink/78 p-6 shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-8">
          <div className="space-y-4 text-sm leading-relaxed text-cream/85 sm:text-[15px]">
            {t.about.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/auth/participant/register"
              className="inline-flex items-center gap-2 rounded-full bg-cream px-8 py-3 text-sm font-semibold text-forestdeep transition-all duration-200 hover:-translate-y-0.5 hover:bg-white"
            >
              {t.about.cta}
              <svg width="15" height="11" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M1 6h13M9.5 1.5 14 6l-4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
