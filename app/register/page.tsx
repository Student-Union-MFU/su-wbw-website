"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** ย้ายไป /auth/participant/register แล้ว — เหลือไว้เปลี่ยนเส้นทางกันลิงก์เก่าพัง */
export default function RegisterRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/auth/participant/register");
  }, [router]);
  return null;
}
