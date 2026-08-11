"use client";

import Link from "next/link";
import ForestScene from "@/components/ForestScene";
import { DAY_STILL } from "@/lib/dayCycle";
import { headingFont, useLang } from "@/lib/i18n/LanguageProvider";

/**
 * 404 — URL ที่ไม่ตรงกับหน้าไหนเลย (และ notFound() ที่ถูกเรียกจากหน้าอื่น)
 *
 * ใช้ฉากป่าเดียวกับหน้า /about ไม่ใช่พื้นสีเปล่า ๆ — หน้าที่หลงเข้ามายังควรอยู่ในเว็บ
 * เดียวกัน · ฉาก 3D อยู่ใน SceneHost ของ layout อยู่แล้ว ตรงนี้แค่สั่งให้เป็นภาพนิ่ง
 *
 * เป็น client component เพราะต้องอ่านภาษาที่ผู้ใช้เลือกจาก context
 * (จึง export metadata ไม่ได้ — title จะใช้ค่าตั้งต้นจาก app/layout.tsx)
 */
export default function NotFound() {
  const { t, lang } = useLang();

  return (
    <>
      <ForestScene day={DAY_STILL} focus="center" />
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-4 pb-24 pt-28 text-center sm:pt-32">
        <p className="text-[10px] uppercase tracking-[0.42em] text-goldsoft sm:text-xs">
          {t.errorPage.notFoundEyebrow}
        </p>
        <h1
          className="mt-4 text-[clamp(2.2rem,6vw,4rem)] leading-[1.02] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
          style={headingFont(lang, 1.25)}
        >
          {t.errorPage.notFoundHeading}
        </h1>

        <div className="mt-9 rounded-[26px] border border-cream/15 bg-ink/78 p-6 shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-8">
          <p className="text-sm leading-relaxed text-cream/85 sm:text-[15px]">
            {t.errorPage.notFoundBody}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/landing"
              className="inline-flex items-center gap-2 rounded-full bg-cream px-8 py-3 text-sm font-semibold text-forestdeep transition-all duration-200 hover:-translate-y-0.5 hover:bg-white"
            >
              {t.nav.back}
            </Link>
            <Link
              href="/auth/participant/register"
              className="inline-flex items-center gap-2 rounded-full border border-cream/25 px-8 py-3 text-sm text-cream/85 transition-colors duration-200 hover:border-cream/50 hover:text-cream"
            >
              {t.about.cta}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
