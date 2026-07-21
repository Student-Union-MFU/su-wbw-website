"use client";

import Reveal from "./Reveal";
import DustParticles from "./DustParticles";
import { useT } from "@/lib/i18n/LanguageProvider";

// Section 3 — footer
export default function SiteFooter() {
  const t = useT();
  return (
    <footer
      className="relative overflow-hidden bg-forestdeep text-cream"
      style={{ fontFamily: "var(--font-kanit)" }}
    >
      {/* แสงอุ่นจางมุมบน */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[120%] -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />

      {/* ละอองฝุ่นลอย */}
      <DustParticles />

      <Reveal className="relative z-10 mx-auto max-w-5xl px-6 py-16 sm:py-20">
        {/* brand */}
        <div className="text-center">
          <h2
            className="text-4xl leading-none text-cream sm:text-6xl"
            style={{ fontFamily: "var(--font-hand)" }}
          >
            {t.hero.title}
          </h2>
          <p className="mt-4 text-lg font-medium text-cream/75 sm:text-xl">
            {t.footer.subtitle}
          </p>
        </div>

        {/* ติดตาม */}
        <div className="mt-14 text-center">
          <div>
            <p className="text-sm font-semibold text-gold">{t.footer.follow}</p>
            <p className="mt-3 text-cream/80">{t.footer.org}</p>
            <div className="mt-3 flex justify-center gap-3">
              <a
                href="https://web.facebook.com/mfu.su"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/20 text-cream/80 transition-colors hover:border-gold hover:text-gold"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H9v3h2v6h3v-6h2.5l.5-3H14V9c0-.6.4-1 1-1z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/su.mfu"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/20 text-cream/80 transition-colors hover:border-gold hover:text-gold"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@su.mfu"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/20 text-cream/80 transition-colors hover:border-gold hover:text-gold"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 3c.3 1.9 1.4 3.3 3 4 .5.3 1 .4 1.5.4v2.9c-1.6 0-3-.5-4.3-1.4v6.6a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v3a2.6 2.6 0 1 0 1.8 2.5V3h2.7z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* ร่วมกับ สำนักวิชา — โลโก้วงกลม + ชื่อ + ลิงก์ IG */}
        <div className="mt-16 text-center">
          <p className="text-sm font-semibold text-gold">{t.footer.partners}</p>
          <div className="mt-7 flex flex-wrap items-start justify-center gap-x-14 gap-y-8">
            {[
              {
                name: "School of Integrative Medicine",
                logo: "/schools/integrative.jpg",
                href: "https://www.instagram.com/smoim.mfu/",
              },
              {
                name: "School of Applied Digital Technology",
                logo: "/schools/adt.jpg",
                href: "https://www.instagram.com/smo.adt.mfu/",
              },
              {
                name: "School of Sinology",
                logo: "/schools/sinology.jpg",
                href: "https://www.instagram.com/smosino.mfu/",
              },
            ].map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-36 flex-col items-center gap-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.logo}
                  alt={s.name}
                  className="h-20 w-20 rounded-full object-cover ring-1 ring-cream/20 transition group-hover:ring-2 group-hover:ring-gold"
                />
                <span className="text-sm leading-snug text-cream/75 transition-colors group-hover:text-gold">
                  {s.name}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* bottom bar */}
        <div className="mt-12 border-t border-cream/15 pt-6 text-center text-xs text-cream/45">
          {t.footer.bottom}
        </div>
      </Reveal>
    </footer>
  );
}
