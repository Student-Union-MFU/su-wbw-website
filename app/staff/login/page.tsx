"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** ย้ายไป /auth/staff/login แล้ว — เหลือไว้เปลี่ยนเส้นทางกันลิงก์เก่าพัง */
export default function StaffLoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/auth/staff/login");
  }, [router]);
  return null;
}
