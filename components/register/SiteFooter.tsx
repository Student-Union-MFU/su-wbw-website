"use client";

import Link from "next/link";

import { headingFont, useT } from "@/lib/i18n/LanguageProvider";

/**
 * Section 3 — footer (ใช้ร่วมกันทั้ง /landing และ /register)
 *
 * **ไม่มีพื้นหลังเลย** — ตัวหนังสือลอยอยู่บนสิ่งที่อยู่ข้างหลังตรง ๆ
 * บนหน้าสมัครคือฉากป่า 3D · บนหน้า landing คือ bg-forestdeep ของตัวหน้า
 *
 * เมื่อไม่มีพื้นรอง ความอ่านออกมาจาก text-shadow อย่างเดียว (วิธีเดียวกับที่
 * หน้า landing ใช้กับข้อความที่ลอยทับฉาก) — text-shadow เป็น property ที่
 * ตกทอดถึงลูก เลยประกาศครั้งเดียวที่ footer แล้วมีผลกับตัวหนังสือทั้งหมด
 * ส่วนไอคอน/โลโก้เป็น SVG กับ img ซึ่ง text-shadow ไม่มีผล ต้องใช้ drop-shadow แยก
 *
 * ข้อควรรู้: เงาช่วยได้มาก แต่ไม่ใช่การรับประกันแบบวัดค่า contrast ได้เหมือน
 * ตอนมีพื้นรอง ถ้าฉากหลังสว่างจัด (ท้องฟ้ากลางวันเต็ม ๆ) ตัวเล็กสุดจะเริ่มอ่านยาก
 */
export default function SiteFooter() {
  const t = useT();
  return (
    <footer
      className="relative z-10 text-cream [text-shadow:0_1px_2px_rgba(0,0,0,0.55),0_2px_14px_rgba(0,0,0,0.7)]"
    >
      <div className="relative z-10 mx-auto max-w-5xl px-6 py-16 sm:py-20">
        {/* brand */}
        <div className="text-center">
          <h2
            className="text-4xl leading-none text-cream sm:text-6xl"
            style={headingFont("en")}
          >
            {t.hero.title}
          </h2>
          <p className="mt-4 text-lg font-medium text-cream sm:text-xl">
            {t.footer.subtitle}
          </p>
        </div>

        {/* ติดตาม */}
        <div className="mt-14 text-center">
          <div>
            <p className="text-sm font-semibold text-goldsoft">{t.footer.follow}</p>
            <div className="mt-4 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/schools/LOGO-02.png"
                alt={t.footer.org}
                className="h-36 w-36 object-contain drop-shadow-[0_3px_10px_rgba(0,0,0,0.6)]"
              />
            </div>
            <div className="mt-3 flex justify-center gap-3">
              <a
                href="https://web.facebook.com/mfu.su"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/45 text-cream drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)] transition-colors hover:border-goldsoft hover:text-goldsoft"
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
                className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/45 text-cream drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)] transition-colors hover:border-goldsoft hover:text-goldsoft"
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
                className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/45 text-cream drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)] transition-colors hover:border-goldsoft hover:text-goldsoft"
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
          <p className="text-sm font-semibold text-goldsoft">{t.footer.partners}</p>
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
                  className="h-20 w-20 rounded-full object-cover ring-1 ring-cream/40 drop-shadow-[0_3px_10px_rgba(0,0,0,0.6)] transition group-hover:ring-2 group-hover:ring-goldsoft"
                />
                <span className="text-sm leading-snug text-cream transition-colors group-hover:text-goldsoft">
                  {s.name}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* bottom bar */}
        <div className="mt-12 border-t border-cream/30 pt-6 text-center text-xs text-cream/85">
          {t.footer.bottom}
          {/* ลิงก์นโยบายความเป็นส่วนตัว — URL เดียวกับที่กรอกใน App Store Connect
              Apple ต้องเปิดจากหน้าเว็บเจอด้วย ไม่ใช่รู้ URL ตรง ๆ อย่างเดียว */}
          <div className="mt-2">
            <Link
              href="/privacy"
              className="underline decoration-cream/40 underline-offset-2 transition-colors hover:text-goldsoft"
            >
              {t.footer.privacy}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
