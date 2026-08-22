"use client";

import Link from "next/link";

import ForestScene from "@/components/ForestScene";
import Rich, { EMAIL } from "@/components/RichText";
import SocialLinks from "@/components/SocialLinks";
import { headingFont, useLang } from "@/lib/i18n/LanguageProvider";
import { DAY_STILL } from "@/lib/dayCycle";

export default function SupportPage() {
  const { t, lang } = useLang();
  const s = t.support;
  return (
    <>
      <ForestScene day={DAY_STILL} focus="center" />
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-24 pt-28 sm:pt-32">
        <header className="text-center">
          <p className="text-[10px] uppercase tracking-[0.42em] text-goldsoft sm:text-xs">
            {s.eyebrow}
          </p>
          <h1
            className="mt-4 text-[clamp(2rem,5vw,3.4rem)] leading-[1.05] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
            style={headingFont(lang, 1.25)}
          >
            {s.heading}
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base text-cream/85">{s.lead}</p>
        </header>

        {/* กล่องอีเมลกับกล่องเหตุฉุกเฉินอยู่บนสุด — คนที่เปิดหน้านี้เพราะกำลังมีปัญหา
            ต้องเจอช่องทางก่อน ไม่ใช่ต้องเลื่อนผ่าน FAQ ทั้งชุดไปหา */}
        <div className="mt-9 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[26px] border border-cream/15 bg-ink/82 p-6 text-center shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            <p className="text-[11px] uppercase tracking-[0.18em] text-cream/55">{s.emailLabel}</p>
            <a
              href={`mailto:${EMAIL}`}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-cream px-6 py-2.5 text-sm font-semibold text-forestdeep transition-all duration-200 hover:-translate-y-0.5 hover:bg-white"
            >
              {EMAIL}
            </a>
            <p className="mt-3 text-xs leading-relaxed text-cream/70">{s.emailNote}</p>
          </div>

          <div className="rounded-[26px] border border-goldsoft/40 bg-ink/82 p-6 text-center shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            <p className="text-[11px] uppercase tracking-[0.18em] text-goldsoft">
              {s.emergencyTitle}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-cream/85">
              <Rich text={s.emergencyBody} />
            </p>
          </div>
        </div>

        <article className="mt-4 rounded-[26px] border border-cream/15 bg-ink/78 p-6 shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-9">
          {s.groups.map((g) => (
            <section key={g.title} className="mt-10 first:mt-0">
              <h2 className="text-xl text-goldsoft sm:text-2xl" style={headingFont(lang, 1.15)}>
                {g.title}
              </h2>

              <dl className="mt-4 space-y-6">
                {g.items.map((item) => (
                  <div key={item.q}>
                    <dt className="text-sm font-semibold text-cream sm:text-[15px]">{item.q}</dt>
                    <dd className="mt-2 space-y-3 text-sm leading-relaxed text-cream/85 sm:text-[15px]">
                      {item.a.map((line, i) => (
                        <p key={i}>
                          <Rich text={line} />
                        </p>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}

          <div className="mt-10 border-t border-cream/12 pt-6 text-center">
            <p className="text-[11px] uppercase tracking-[0.18em] text-cream/55">{s.followLabel}</p>
            <SocialLinks />
            <Link
              href="/privacy"
              className="mt-6 inline-block text-xs text-cream/70 underline decoration-cream/40 underline-offset-2 transition-colors hover:text-goldsoft"
            >
              {s.privacyLink}
            </Link>
          </div>
        </article>
      </main>
    </>
  );
}
