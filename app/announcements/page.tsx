"use client";

import ComingSoon from "@/components/landing/ComingSoon";
import { useT } from "@/lib/i18n/LanguageProvider";

/** placeholder — ประกาศจากแผงผู้ดูแลจะมาแสดงที่นี่ */
export default function AnnouncementsPage() {
  const t = useT();
  return <ComingSoon title={t.nav.announcements} />;
}
