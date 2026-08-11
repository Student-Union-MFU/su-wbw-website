"use client";

import { useEffect } from "react";
import Link from "next/link";
import ForestScene from "@/components/ForestScene";
import { DAY_STILL } from "@/lib/dayCycle";
import { headingFont, useLang } from "@/lib/i18n/LanguageProvider";

/**
 * Error boundary ของทั้งเว็บ — ครอบ {children} ใน app/layout.tsx
 * layout (แถบเมนู + ฉาก 3D + ตัวเลือกภาษา) ยังอยู่ครบ พังแค่เนื้อหาข้างใน
 * ถ้า layout เองพัง จะตกไปที่ app/global-error.tsx แทน
 *
 * ⚠ Next รุ่นนี้ส่ง `unstable_retry` มาให้ ไม่ใช่ `reset` แบบที่เคยเป็น —
 * retry จะ re-fetch แล้ว render ใหม่ ส่วน reset แค่ล้าง state ของ boundary
 * (ดู node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md)
 */
export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const { t, lang } = useLang();

  useEffect(() => {
    // ยังไม่มีบริการเก็บ error ปลายทาง — อย่างน้อยให้เห็นใน console ของเครื่องผู้ใช้
    // ตอนช่วยแก้ปัญหาทางโทรศัพท์ (digest คือรหัสเดียวกับที่แสดงบนหน้า)
    console.error("[wbw] หน้าเกิดข้อผิดพลาด", error);
  }, [error]);

  return (
    <>
      <ForestScene day={DAY_STILL} focus="center" />
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-4 pb-24 pt-28 text-center sm:pt-32">
        <p className="text-[10px] uppercase tracking-[0.42em] text-goldsoft sm:text-xs">
          {t.errorPage.errorEyebrow}
        </p>
        <h1
          className="mt-4 text-[clamp(2rem,5.5vw,3.4rem)] leading-[1.05] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
          style={headingFont(lang, 1.25)}
        >
          {t.errorPage.errorHeading}
        </h1>

        <div className="mt-9 rounded-[26px] border border-cream/15 bg-ink/78 p-6 shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-8">
          <p className="text-sm leading-relaxed text-cream/85 sm:text-[15px]">
            {t.errorPage.errorBody}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => unstable_retry()}
              className="inline-flex items-center gap-2 rounded-full bg-cream px-8 py-3 text-sm font-semibold text-forestdeep transition-all duration-200 hover:-translate-y-0.5 hover:bg-white"
            >
              {t.errorPage.retry}
            </button>
            <Link
              href="/landing"
              className="inline-flex items-center gap-2 rounded-full border border-cream/25 px-8 py-3 text-sm text-cream/85 transition-colors duration-200 hover:border-cream/50 hover:text-cream"
            >
              {t.nav.back}
            </Link>
          </div>

          {/* digest = รหัสที่ Next ผูกไว้กับ error ก้อนนั้นใน log ฝั่ง server
              ให้ผู้ใช้อ่านให้ทีมงานฟังได้ตรง ๆ เร็วกว่าให้เล่าว่ากดอะไรมาบ้าง */}
          {error.digest && (
            <p className="mt-6 font-mono text-[11px] tracking-wide text-cream/45">
              {t.errorPage.refCode(error.digest)}
            </p>
          )}
        </div>
      </main>
    </>
  );
}
