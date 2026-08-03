"use client";

import Link from "next/link";
import NavBar from "./NavBar";
import { headingFont, useLang } from "@/lib/i18n/LanguageProvider";

/** หน้าเปล่าสำหรับเมนูที่ยังไม่ได้ทำ (แผนที่ / ประกาศ) — มี NavBar ให้กลับไปหน้าอื่นได้ */
export default function ComingSoon({ title }: { title: string }) {
  const { t, lang } = useLang();

  return (
    <>
      <NavBar />
      <main className="flex min-h-screen flex-col items-center justify-center bg-forestdeep px-6 text-center text-cream">
        <p className="text-[10px] uppercase tracking-[0.4em] text-gold">{t.nav.soon}</p>
        <h1
          // title มาจากเมนู (เช่น "แผนที่"/"Map") → สลับฟอนต์ตามภาษา
          className="mt-5 text-4xl leading-tight sm:text-6xl"
          style={headingFont(lang)}
        >
          {title}
        </h1>
        <p className="mt-4 max-w-md text-sm text-cream/70 sm:text-base">{t.nav.soonBody}</p>
        <Link
          href="/landing"
          className="mt-9 inline-flex items-center gap-2 rounded-full bg-cream px-7 py-3 text-sm font-semibold text-forestdeep transition-transform duration-300 hover:scale-[1.03]"
        >
          {t.nav.back}
        </Link>
      </main>
    </>
  );
}
