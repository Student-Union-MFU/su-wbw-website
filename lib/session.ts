"use client";

import { useCallback, useEffect, useState } from "react";
import type { Role, Session } from "@/lib/adminApi";

/**
 * เซสชันที่เก็บใน localStorage — ใช้ร่วมกันระหว่าง /dashboard (เจ้าหน้าที่/ผู้ดูแล)
 * กับ /me (ผู้เข้าร่วม) · สองหน้านี้เป็นคนละ route แต่แชร์ที่เก็บ token เดียวกัน
 * เพื่อไม่ให้ต้องล็อกอินซ้ำเวลาเด้งข้ามหน้ากัน
 *
 * (คีย์ยังขึ้นต้น wbw.admin.* ตามของเดิม — เก็บไว้ให้เซสชันเก่าไม่หลุด)
 */
const TOKEN_KEY = "wbw.admin.token";
const USER_KEY = "wbw.admin.user";
const ROLE_KEY = "wbw.admin.role";

/** บทบาทที่เข้าแผงผู้ดูแลได้ · นอกจากนี้ (participant) ไปหน้าโปรไฟล์ตัวเอง */
export const STAFF_ROLES: Role[] = ["admin", "staff"];
export const isStaff = (role: Role) => STAFF_ROLES.includes(role);

/**
 * ปลายทางหลังล็อกอิน แยกตามบทบาท — ที่เดียวที่ตัดสินว่าแต่ละบทบาทไป "หน้าของตัวเอง" ไหน
 *   admin       → /dashboard        (แผงผู้ดูแล)
 *   staff       → /staff/me         (หน้าเจ้าหน้าที่)
 *   participant → /participant/me   (โปรไฟล์ผู้เข้าร่วม)
 */
export function homePathForRole(role: Role): string {
  if (role === "admin") return "/dashboard";
  if (role === "staff") return "/staff/me";
  return "/participant/me";
}

export type StoredSession = { token: string; username: string; role: Role };

export function readSession(): StoredSession | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  return {
    token,
    username: localStorage.getItem(USER_KEY) ?? "",
    role: (localStorage.getItem(ROLE_KEY) as Role) ?? "participant",
  };
}

// useSession ถูกเรียกหลายที่พร้อมกัน (NavBar + ตัวหน้า) แต่ละที่มี state ของตัวเอง
// เวลา sign in/out ที่หนึ่ง ต้องให้ instance อื่นรู้ด้วย — ยิง event ในแท็บเดียวกัน
// (event 'storage' ของ browser ไม่ยิงในแท็บที่แก้เอง เลยต้องมี event ของเราคู่กัน)
const SESSION_EVENT = "wbw:session";
function emitSessionChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EVENT));
}

export function writeSession(s: Session) {
  localStorage.setItem(TOKEN_KEY, s.token);
  localStorage.setItem(USER_KEY, s.username);
  localStorage.setItem(ROLE_KEY, s.role);
  emitSessionChange();
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ROLE_KEY);
  emitSessionChange();
}

/**
 * อ่านเซสชันจาก localStorage ฝั่ง client · sync ทุก instance ผ่าน event
 * `ready` = false จนกว่าจะอ่านเสร็จ (กันกระพริบ / กัน hydration mismatch เพราะ
 * server ไม่มี localStorage)
 */
export function useSession() {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setSession(readSession());
    sync();
    setReady(true);
    // 'wbw:session' = แท็บนี้เอง · 'storage' = แท็บอื่น (ล็อกเอาต์แล้วซิงก์ข้ามแท็บ)
    window.addEventListener(SESSION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SESSION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // writeSession/clearSession ยิง event → listener ข้างบน setSession ให้เอง ทุก instance
  const signIn = useCallback((s: Session) => writeSession(s), []);
  const signOut = useCallback(() => clearSession(), []);

  return { session, ready, signIn, signOut };
}
