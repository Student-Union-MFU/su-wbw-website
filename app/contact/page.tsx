"use client";

import Link from "next/link";

import ForestScene from "@/components/ForestScene";
import SocialLinks from "@/components/SocialLinks";
import { headingFont, useLang } from "@/lib/i18n/LanguageProvider";
import { DAY_STILL } from "@/lib/dayCycle";

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
            <SocialLinks />
          </div>

          {/* คนที่มาหน้านี้เพราะติดปัญหาการใช้งาน ต้องเจอทางไป FAQ กับอีเมล ไม่ใช่เจอแค่โซเชียล */}
          <div className="mt-7 border-t border-cream/12 pt-6">
            <Link
              href="/support"
              className="text-sm text-cream underline decoration-goldsoft/60 underline-offset-2 transition-colors hover:text-goldsoft"
            >
              {t.contact.supportLink}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
