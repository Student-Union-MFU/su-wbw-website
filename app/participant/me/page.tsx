"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ParticipantHome from "@/components/ParticipantHome";
import { useSession, isStaff, homePathForRole } from "@/lib/session";

/**
 * /participant/me — หน้าโปรไฟล์ของผู้เข้าร่วมหลังเข้าสู่ระบบ (ย้ายมาจาก /me เดิม)
 *
 * ล็อกอินยังทำที่ /dashboard (ฟอร์มเดียว ใช้ได้ทุกบทบาท) แล้วเด้งผู้เข้าร่วมมาที่นี่
 * · ยังไม่ล็อกอิน → /dashboard · เจ้าหน้าที่/ผู้ดูแล → หน้าของบทบาทตัวเอง
 */
export default function ParticipantMePage() {
  const router = useRouter();
  const { session, ready, signOut } = useSession();

  const wrongRole = ready && (!session || isStaff(session.role));
  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace("/auth/participant/login");
    else if (isStaff(session.role)) router.replace(homePathForRole(session.role));
  }, [ready, session, router]);

  if (!ready || wrongRole) return null;

  return (
    <ParticipantHome
      token={session!.token}
      studentId={session!.username}
      onLogout={() => {
        signOut();
        router.replace("/landing");
      }}
    />
  );
}
