"use client";

import { useLang } from "@/lib/i18n/LanguageProvider";

/**
 * ปุ่มสลับ ไทย/EN
 *
 * default: ลอยมุมขวาบน (หน้าสมัคร + หน้าล็อกอินผู้ดูแล)
 *   ต้องอ่านออกทั้งบน hero (เข้ม) และฟอร์ม (ครีม) → พื้นเข้มทึบ + ตัวอักษรครีม
 *   z-40: เหนือเนื้อหา (CoverSheet z-10) แต่ต่ำกว่า modal (z-50) จะได้ไม่ทับ popup
 *
 * inline: วางในแถบหัวแผงผู้ดูแล — ใช้สไตล์เดียวกับปุ่ม "ออกจากระบบ" ข้างๆ
 */
export default function LanguageToggle({
  inline = false,
  nav = false,
}: {
  inline?: boolean;
  /** วางในแถบเมนูด้านบน (NavBar) — พื้นเข้มโปร่ง ไม่ต้อง fixed เอง */
  nav?: boolean;
}) {
  const { t, toggle } = useLang();

  const className = nav
    ? "rounded-full border border-cream/25 px-3 py-1.5 text-xs font-medium text-cream/85 transition-colors hover:border-gold hover:text-gold sm:text-sm"
    : inline
      ? "rounded-full border border-line px-3 py-2 text-sm text-muted transition-colors hover:border-forest/40 hover:text-forest"
      : "fixed right-4 top-4 z-40 rounded-full border border-cream/25 bg-ink/70 px-4 py-2 text-sm font-medium text-cream shadow-lg backdrop-blur-md transition-all duration-200 hover:border-gold hover:text-gold sm:right-6 sm:top-6";

  return (
    <button type="button" onClick={toggle} aria-label={t.toggle.aria} className={className}>
      {t.toggle.label}
    </button>
  );
}
