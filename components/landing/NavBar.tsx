"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LanguageToggle from "@/components/register/LanguageToggle";
import NavUser from "@/components/NavUser";
import { useLang } from "@/lib/i18n/LanguageProvider";

/**
 * แถบเมนูด้านบน — ใช้ร่วมกันทุกหน้าฝั่งผู้เข้าร่วม
 *
 * พื้นเข้มโปร่ง + blur เพราะต้องอ่านออกทั้งบนฉาก 3D (เข้ม/สว่างสลับตามเวลา)
 * และบนหน้าพื้นครีม · z-40 เท่าปุ่มภาษาเดิม (ต่ำกว่า modal z-50)
 *
 * มือถือ (<sm): 5 เมนู + โปรไฟล์ + ปุ่มภาษา ยัดแถวเดียวไม่พอ (พิลล์ล้นแล้ว
 * scroll โดนตัดขอบ) → ยุบเมนูเป็นแฮมเบอร์เกอร์ · จอ ≥sm วางเรียงแนวนอนเหมือนเดิม
 */

const LINKS = [
  { href: "/landing", key: "home" },
  { href: "/about", key: "about" },
  { href: "/map", key: "map" },
  { href: "/announcements", key: "announcements" },
  { href: "/contact", key: "contact" },
] as const;

export default function NavBar() {
  const { t, lang } = useLang();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // ปิดเมื่อคลิกนอกกล่อง หรือกด Escape (เปลี่ยนหน้าเมนูปิดเองจาก onClick ของลิงก์)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    /* font-ui = ฟอนต์เรียบ ไม่ใช่ตัวกลม ๆ ของทั้งเว็บ — ตัวหนังสือในแถบนี้เล็กและ
       ต้องอ่านฉับไว · ลูกทุกตัว (เมนู ปุ่มเข้าสู่ระบบ ดรอปดาวน์) สืบทอดไปเอง */
    <header className="fixed inset-x-0 top-0 z-40 font-ui">
      <nav className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
        {/* จอเล็ก (<sm): ปุ่มแฮมเบอร์เกอร์ + เมนูดรอปดาวน์ */}
        <div ref={menuRef} className="relative sm:hidden">
          <button
            type="button"
            aria-label={lang === "th" ? "เมนู" : "Menu"}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="flex items-center rounded-full border border-cream/20 bg-ink/60 px-3 py-2.5 text-cream/85 backdrop-blur-md transition-colors hover:text-cream"
          >
            {/* สามขีดที่ "มอร์ฟ" เป็นกากบาทตอนเปิด — ขีดบน/ล่างหมุนมาไขว้ ขีดกลางจาง */}
            <span className="relative block h-3.5 w-5" aria-hidden="true">
              <span
                className={`absolute left-0 h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-in-out ${
                  open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 rounded-full bg-current transition-all duration-300 ease-in-out ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-in-out ${
                  open ? "bottom-1/2 translate-y-1/2 -rotate-45" : "bottom-0"
                }`}
              />
            </span>
          </button>

          {open && (
            <ul className="absolute left-0 top-[calc(100%+0.5rem)] flex w-52 origin-top-left animate-[menuIn_0.16s_ease-out] flex-col gap-0.5 rounded-2xl border border-cream/15 bg-ink/85 p-2 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.85)] backdrop-blur-xl">
              {LINKS.map((l) => {
                const active = pathname === l.href;
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? "bg-cream text-forestdeep"
                          : "text-cream/85 hover:bg-cream/10 hover:text-cream"
                      }`}
                    >
                      {t.nav[l.key]}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* จอ ≥sm: เมนูเรียงแนวนอนในพิลล์ (เหมือนเดิม · overflow-x-auto กันจอแคบ) */}
        <ul className="hidden min-w-0 items-center gap-0.5 overflow-x-auto rounded-full border border-cream/20 bg-ink/60 px-1.5 py-1.5 backdrop-blur-md [scrollbar-width:none] sm:flex sm:gap-1 sm:px-2 [&::-webkit-scrollbar]:hidden">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`block whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
                    active
                      ? "bg-cream text-forestdeep"
                      : "text-cream/80 hover:bg-cream/10 hover:text-cream"
                  }`}
                >
                  {t.nav[l.key]}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* ขวาสุด: เข้าสู่ระบบ/โปรไฟล์ + สลับภาษา */}
        <div className="ml-auto flex items-center gap-2 rounded-full border border-cream/20 bg-ink/60 px-1.5 py-1.5 backdrop-blur-md sm:px-2">
          <NavUser loginClass="rounded-full bg-gold/90 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-gold sm:px-4 sm:text-sm" />
          <LanguageToggle nav />
        </div>
      </nav>
    </header>
  );
}
