"use client";

import ComingSoon from "@/components/landing/ComingSoon";
import { useT } from "@/lib/i18n/LanguageProvider";

/** placeholder — รอใส่แผนที่เส้นทางจริงทีหลัง */
export default function MapPage() {
  const t = useT();
  return <ComingSoon title={t.nav.map} />;
}
