"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { getMyProfile, type MyProfile } from "@/lib/adminApi";
import { useT } from "@/lib/i18n/LanguageProvider";

/**
 * ปุ่มขวาสุดของ NavBar
 *   · ยังไม่ล็อกอิน → ปุ่ม "เข้าสู่ระบบ" (ลิงก์ไป /dashboard เหมือนเดิม)
 *   · ล็อกอินแล้ว → avatar + ชื่อ · กดแล้วเปิด dropdown โชว์รูป/ชื่อ/รหัสนักศึกษา + ออกจากระบบ
 *
 * รูป+ชื่อดึงจาก /api/me (ของผู้เข้าร่วม) · เจ้าหน้าที่/ผู้ดูแล /me คืน 404
 * เลย fallback เป็น username + ป้ายบทบาทแทน
 */
export default function NavUser({ loginClass }: { loginClass: string }) {
  const t = useT();
  const router = useRouter();
  const { session, ready, signOut } = useSession();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // โปรไฟล์ผู้เข้าร่วม (รูป+ชื่อ) · เจ้าหน้าที่จะได้ 404 → profile คงเป็น null
  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    let alive = true;
    getMyProfile(session.token)
      .then((p) => alive && setProfile(p))
      .catch((e: Error) => {
        if (!alive) return;
        if (e.message === "unauthorized") signOut(); // token เสีย → เคลียร์
        setProfile(null);
      });
    return () => {
      alive = false;
    };
  }, [session, signOut]);

  // ปิด dropdown เมื่อคลิกนอกกล่อง หรือกด Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // ยังไม่พร้อม/ยังไม่ล็อกอิน → ปุ่มเข้าสู่ระบบเดิม
  if (!ready || !session) {
    return (
      <Link href="/dashboard" className={loginClass}>
        {t.nav.login}
      </Link>
    );
  }

  const name = profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() : "";
  const displayName = name || session.username;
  const photo = profile?.photo_url ?? null;
  const roleLabel =
    session.role === "admin" ? t.dash.users.roleAdmin : session.role === "staff" ? t.dash.users.roleStaff : "";
  // บรรทัดรอง: ผู้เข้าร่วม = รหัสนักศึกษา · เจ้าหน้าที่ = ป้ายบทบาท
  const subline = profile?.student_id ?? (roleLabel || session.username);
  const initial = (displayName || "?").charAt(0).toUpperCase();

  function doSignOut() {
    setOpen(false);
    signOut();
    router.push("/landing");
  }

  const Avatar = ({ size }: { size: string }) => (
    <span
      className={`flex ${size} flex-none items-center justify-center overflow-hidden rounded-full border border-cream/25 bg-cream/15 text-cream`}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs font-bold">{initial}</span>
      )}
    </span>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-1 text-cream/85 transition-colors hover:text-cream sm:pr-2.5"
      >
        <Avatar size="h-7 w-7" />
        <span className="hidden max-w-[9rem] truncate text-sm font-medium sm:block">{displayName}</span>
        <svg
          className={`hidden h-3.5 w-3.5 text-cream/60 transition-transform sm:block ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="none"
        >
          <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.6rem)] w-64 overflow-hidden rounded-2xl border border-cream/15 bg-ink/90 p-2 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.85)] backdrop-blur-xl"
        >
          <div className="flex items-center gap-3 rounded-xl px-3 py-3">
            <Avatar size="h-11 w-11" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-cream">{displayName}</div>
              <div className="truncate text-xs text-cream/60">{subline}</div>
            </div>
          </div>

          {profile && (
            <Link
              href="/me"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="block rounded-xl px-3 py-2.5 text-sm text-cream/85 transition-colors hover:bg-cream/10 hover:text-cream"
            >
              {t.dash.me.profileTitle}
            </Link>
          )}

          <button
            type="button"
            onClick={doSignOut}
            role="menuitem"
            className="mt-0.5 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-cream/85 transition-colors hover:bg-cream/10 hover:text-cream"
          >
            <svg className="h-4 w-4 flex-none" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M8 5.5V4a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 17 4v12a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 8 16v-1.5M11 10H2.5m0 0 3-3m-3 3 3 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t.dash.me.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
