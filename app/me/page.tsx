"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, homePathForRole } from "@/lib/session";

/**
 * /me — ย้ายไปเป็นหน้าแยกตามบทบาทแล้ว (participant → /participant/me, staff → /staff/me)
 * เหลือไว้เป็นตัวเปลี่ยนเส้นทาง เพื่อไม่ให้ลิงก์/บุ๊กมาร์กเก่าที่ชี้มา /me พัง
 */
export default function MeRedirect() {
  const router = useRouter();
  const { session, ready } = useSession();

  useEffect(() => {
    if (!ready) return;
    router.replace(session ? homePathForRole(session.role) : "/auth/participant/login");
  }, [ready, session, router]);

  return null;
}
