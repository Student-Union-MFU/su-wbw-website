"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LanguageToggle from "@/components/register/LanguageToggle";
import { useLang } from "@/lib/i18n/LanguageProvider";

/**
 * แถบเมนูด้านบน — ใช้ร่วมกันทุกหน้าฝั่งผู้เข้าร่วม
 *
 * พื้นเข้มโปร่ง + blur เพราะต้องอ่านออกทั้งบนฉาก 3D (เข้ม/สว่างสลับตามเวลา)
 * และบนหน้าพื้นครีม · z-40 เท่าปุ่มภาษาเดิม (ต่ำกว่า modal z-50)
 */

const LINKS = [
  { href: "/landing", key: "home" },
  { href: "/map", key: "map" },
  { href: "/announcements", key: "announcements" },
] as const;

export default function NavBar() {
  const { t } = useLang();
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <nav className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
        {/* เมนูหลัก */}
        <ul className="flex items-center gap-1 rounded-full border border-cream/20 bg-ink/60 px-1.5 py-1.5 backdrop-blur-md sm:gap-2 sm:px-2">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
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

        {/* ขวาสุด: เข้าสู่ระบบ + สลับภาษา */}
        <div className="ml-auto flex items-center gap-2 rounded-full border border-cream/20 bg-ink/60 px-1.5 py-1.5 backdrop-blur-md sm:px-2">
          <Link
            href="/dashboard"
            className="rounded-full bg-gold/90 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-gold sm:px-4 sm:text-sm"
          >
            {t.nav.login}
          </Link>
          <LanguageToggle nav />
        </div>
      </nav>
    </header>
  );
}
