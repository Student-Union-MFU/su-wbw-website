"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ParticipantHome from "@/components/ParticipantHome";
import { useSession, isStaff } from "@/lib/session";

/**
 * หน้าของผู้เข้าร่วมหลังเข้าสู่ระบบ — แยกเป็น route ของตัวเอง ไม่ปนกับ /dashboard
 *
 * ล็อกอินยังทำที่ /dashboard (ฟอร์มเดียว ใช้ได้ทุกบทบาท) แล้วเด้งผู้เข้าร่วมมาที่นี่
 * · ยังไม่ล็อกอิน หรือเป็นเจ้าหน้าที่/ผู้ดูแล → ส่งกลับไป /dashboard
 */
export default function MePage() {
  const router = useRouter();
  const { session, ready, signOut } = useSession();

  const redirect = ready && (!session || isStaff(session.role));
  useEffect(() => {
    if (redirect) router.replace("/dashboard");
  }, [redirect, router]);

  if (!ready || redirect) return null;

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
