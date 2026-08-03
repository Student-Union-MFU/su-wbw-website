"use client";

import ForestScene from "@/components/ForestScene";
import { headingFont, useLang } from "@/lib/i18n/LanguageProvider";
import { DAY_STILL } from "@/lib/dayCycle";


const SOCIALS = [
  {
    name: "Facebook",
    href: "https://web.facebook.com/mfu.su",
    icon: <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H9v3h2v6h3v-6h2.5l.5-3H14V9c0-.6.4-1 1-1z" />,
    fill: true,
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/su.mfu",
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    fill: false,
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@su.mfu",
    icon: <path d="M16.5 3c.3 1.9 1.4 3.3 3 4 .5.3 1 .4 1.5.4v2.9c-1.6 0-3-.5-4.3-1.4v6.6a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v3a2.6 2.6 0 1 0 1.8 2.5V3h2.7z" />,
    fill: true,
  },
];

export default function ContactPage() {
  const { t, lang } = useLang();
  return (
    <>
      <ForestScene day={DAY_STILL} focus="center" />
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-28">
        <header className="text-center">
          <p className="text-[10px] uppercase tracking-[0.42em] text-goldsoft sm:text-xs">
            {t.contact.eyebrow}
          </p>
          <h1
            className="mt-4 text-[clamp(2rem,5vw,3.2rem)] leading-[1.05] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
            style={headingFont(lang, 1.25)}
          >
            {t.contact.heading}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm text-cream/78">{t.contact.lead}</p>
        </header>

        <div className="mt-8 rounded-[26px] border border-cream/15 bg-ink/82 p-7 text-center shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          <p className="text-[11px] uppercase tracking-[0.18em] text-cream/55">{t.contact.orgLabel}</p>
          <p className="mt-2 text-base font-semibold text-cream">{t.contact.org}</p>

          <div className="mt-7 border-t border-cream/12 pt-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-cream/55">{t.contact.followLabel}</p>
            <div className="mt-4 flex justify-center gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-cream/25 text-cream transition-colors hover:border-goldsoft hover:text-goldsoft"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill={s.fill ? "currentColor" : "none"}
                    stroke={s.fill ? "none" : "currentColor"}
                    strokeWidth="2"
                  >
                    {s.icon}
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
