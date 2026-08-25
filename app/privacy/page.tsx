"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import ForestScene from "@/components/ForestScene";
import { TextField } from "@/components/register/ui";
import { deleteMyAccount, login } from "@/lib/adminApi";
import { DAY_STILL } from "@/lib/dayCycle";
import { headingFont, useLang } from "@/lib/i18n/LanguageProvider";
import { isStaff, useSession } from "@/lib/session";

/**
 * /privacy — นโยบายความเป็นส่วนตัว + ข้อมูลที่เก็บ + ลบบัญชี รวมอยู่ในหน้าเดียว
 *
 * ทำไมหน้าเดียว: ทั้ง App Store และ Google Play บังคับให้แอปที่สร้างบัญชีได้ต้องมี
 * "URL สาธารณะสำหรับขอลบบัญชี" ที่ผู้ตรวจเปิดดูได้โดยไม่ต้องติดตั้งแอปและไม่ต้องล็อกอิน
 * · ผู้ตรวจต้องเห็นทั้งนโยบาย รายการข้อมูล และวิธีลบ โดยไม่ต้องไล่คลิกหลายหน้า
 * เว็บนี้เป็นเว็บเดียวที่คู่กับแอป จึงเป็นเจ้าของ URL นั้น
 *
 * หน้าเปิดสาธารณะ แต่ "การลบ" ต้องยืนยันตัวตน — ล็อกอินอยู่แล้วก็ใช้เซสชันเดิม
 * ยังไม่ล็อกอินก็กรอกรหัสนักศึกษา/รหัสผ่านตรงนี้ได้เลย ไม่ต้องเด้งออกไปหน้าอื่น
 * แล้วเสียตำแหน่งที่อ่านค้างไว้
 *
 * เนื้อหาส่วน "ข้อมูลที่เก็บ" ตรวจกับ schema จริงของ su-server มาแล้ว
 * (db/migrations/000005 เป็นต้นไป) — อย่าแก้ให้กว้างกว่าที่ระบบเก็บจริง
 */

export default function PrivacyPage() {
  const { t, lang } = useLang();
  const p = t.privacy;

  return (
    <>
      <ForestScene day={DAY_STILL} focus="center" />
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 pb-24 pt-28 sm:pt-32">
        <header className="text-center">
          <p className="text-[10px] uppercase tracking-[0.42em] text-goldsoft sm:text-xs">
            {p.eyebrow}
          </p>
          <h1
            className="mt-4 text-[clamp(2.2rem,6vw,4rem)] leading-[1.02] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
            style={headingFont(lang, 1.25)}
          >
            {p.heading}
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base text-cream/85">{p.lead}</p>
          <p className="mt-3 text-xs text-cream/55">{p.updated}</p>
          {/* ลิงก์ข้ามลงไปส่วนลบบัญชี — คนที่เปิดหน้านี้เพราะอยากลบ ไม่ต้องเลื่อนผ่านนโยบายทั้งหมด
              (ผู้ตรวจของสโตร์ก็ใช้ทางลัดนี้เหมือนกัน) */}
          <a
            href="#delete"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-goldsoft underline-offset-4 transition-colors hover:text-cream hover:underline"
          >
            {p.jumpToDelete}
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M6 1v11M1.5 8 6 12.5 10.5 8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </header>

        {/* ---------- นโยบาย ---------- */}
        <Card>
          <SectionTitle>{p.policyTitle}</SectionTitle>
          <div className="mt-5 space-y-5">
            {p.policy.map((s) => (
              <div key={s.h}>
                <h3 className="text-[15px] font-semibold text-cream">{s.h}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-cream/80">{s.body}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* ---------- ข้อมูลที่เก็บ ---------- */}
        <Card>
          <SectionTitle>{p.dataTitle}</SectionTitle>
          <p className="mt-2 text-sm text-cream/65">{p.dataIntro}</p>
          <div className="mt-6 space-y-6">
            {p.dataGroups.map((g) => (
              <div key={g.h}>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-goldsoft">
                  {g.h}
                </h3>
                <ul className="mt-2.5 space-y-2">
                  {g.items.map((item) => (
                    <Bullet key={item}>{item}</Bullet>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-7 rounded-[18px] border border-cream/12 bg-cream/[0.04] p-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cream/70">
              {p.notCollectedTitle}
            </h3>
            <ul className="mt-2.5 space-y-2">
              {p.notCollected.map((item) => (
                <Bullet key={item} tone="muted">
                  {item}
                </Bullet>
              ))}
            </ul>
          </div>
        </Card>

        {/* ---------- ลบบัญชี ---------- */}
        <DeleteSection />

        {/* ---------- ติดต่อ ---------- */}
        <Card>
          <SectionTitle>{p.contactTitle}</SectionTitle>
          <address className="mt-3 text-sm not-italic leading-relaxed text-cream/80">
            {p.contactOrg}
            <br />
            {p.contactAddress}
            <br />
            <a
              href="mailto:studentunion.developer@gmail.com"
              className="text-goldsoft underline decoration-goldsoft/40 underline-offset-4 transition-colors hover:text-cream"
            >
              studentunion.developer@gmail.com
            </a>
          </address>
          <div className="mt-5 border-t border-cream/12 pt-5">
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-goldsoft underline-offset-4 transition-colors hover:text-cream hover:underline"
            >
              {t.nav.contact}
              <svg width="14" height="11" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M1 6h13M9.5 1.5 14 6l-4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </Card>
      </main>
    </>
  );
}

/* ============================================================
   ส่วนลบบัญชี — สามสถานะ: ยังไม่ยืนยันตัวตน / ยืนยันแล้วรอกดลบ / ลบเสร็จแล้ว
   ============================================================ */

function DeleteSection() {
  const { t } = useLang();
  const p = t.privacy;
  const { session, ready, signIn, signOut } = useSession();

  // ฟอร์มยืนยันตัวตน (ใช้เมื่อยังไม่ได้ล็อกอิน)
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // เทียบแบบไม่สนตัวพิมพ์และช่องว่างหัวท้าย — คำยืนยันเป็นการกันพลาด ไม่ใช่การสอบ
  const confirmed = confirm.trim().toLowerCase() === p.delConfirmWord.toLowerCase();

  async function verify() {
    setError(null);
    setBusy(true);
    try {
      signIn(await login(studentId.trim(), password));
      setPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : p.delFailed);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!session || !confirmed) return;
    setError(null);
    setBusy(true);
    try {
      await deleteMyAccount(session.token);
      // เคลียร์เซสชันในเครื่องด้วย ไม่งั้นแถบเมนูยังโชว์ชื่อคนที่เพิ่งลบไป
      // แล้วทุกหน้าที่ต้องล็อกอินจะเด้ง 401 แบบไม่มีคำอธิบาย
      signOut();
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : p.delFailed);
    } finally {
      setBusy(false);
    }
  }

  // อ่านเซสชันจาก localStorage ยังไม่เสร็จ — ยังไม่รู้ว่าจะแสดงฟอร์มไหน
  // ปล่อยกล่องเปล่าไว้ก่อนดีกว่าโชว์ฟอร์มล็อกอินให้คนที่ล็อกอินอยู่แล้วเห็นแวบหนึ่ง
  const showBody = ready;

  return (
    <Card id="delete" danger>
      <SectionTitle>{p.delTitle}</SectionTitle>

      {done ? (
        <div className="mt-4">
          <p className="text-base font-semibold text-cream">{p.delDoneTitle}</p>
          <p className="mt-2 text-sm leading-relaxed text-cream/80">{p.delDoneBody}</p>
          <Link
            href="/landing"
            className="mt-6 inline-flex rounded-full bg-cream px-7 py-3 text-sm font-semibold text-forestdeep transition-all duration-200 hover:-translate-y-0.5 hover:bg-white"
          >
            {p.delBackHome}
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-cream/80">{p.delIntro}</p>

          <div className="mt-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-goldsoft">
              {p.delWhatTitle}
            </h3>
            <ul className="mt-2.5 space-y-2">
              {p.delWhat.map((item) => (
                <Bullet key={item}>{item}</Bullet>
              ))}
            </ul>
          </div>

          <div className="mt-6 rounded-[18px] border border-cream/12 bg-cream/[0.04] p-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cream/70">
              {p.delKeepTitle}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-cream/70">{p.delKeep}</p>
            <p className="mt-3 text-sm leading-relaxed text-cream/70">{p.delSeatNote}</p>
          </div>

          {showBody && (
            <div className="on-dark mt-7 border-t border-cream/12 pt-6">
              {session && isStaff(session.role) ? (
                /* เจ้าหน้าที่/ผู้ดูแล — backend ตอบ 403 อยู่แล้ว แต่บอกตั้งแต่ตรงนี้
                   ดีกว่าปล่อยให้กรอกจนจบแล้วค่อยเจอข้อความปฏิเสธ */
                <>
                  <h3 className="text-[15px] font-semibold text-cream">{p.delStaffTitle}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-cream/80">{p.delStaffBody}</p>
                </>
              ) : session ? (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="text-sm text-cream/80">{p.delSignedInAs(session.username)}</p>
                    <button
                      type="button"
                      onClick={signOut}
                      className="text-xs text-cream/55 underline-offset-4 transition-colors hover:text-cream hover:underline"
                    >
                      {p.delNotYou}
                    </button>
                  </div>

                  <div className="mt-5 space-y-4">
                    <TextField
                      label={p.delConfirmLabel}
                      value={confirm}
                      onChange={setConfirm}
                      autoComplete="off"
                      hint={p.delConfirmHint(p.delConfirmWord)}
                    />
                    {error && <ErrorNote>{error}</ErrorNote>}
                    <button
                      type="button"
                      onClick={remove}
                      disabled={busy || !confirmed}
                      className="w-full rounded-full bg-danger py-3 font-semibold text-white transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {busy ? p.delSubmitting : p.delSubmit}
                    </button>
                    {!confirmed && confirm.length > 0 && (
                      <p className="text-center text-xs text-cream/50">{p.delConfirmMismatch}</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-[15px] font-semibold text-cream">{p.delSignInTitle}</h3>
                  <p className="mt-1.5 text-sm text-cream/70">{p.delSignInHint}</p>
                  <div className="mt-5 space-y-4">
                    <TextField
                      label={p.delStudentId}
                      value={studentId}
                      onChange={setStudentId}
                      autoComplete="username"
                      inputMode="numeric"
                    />
                    <TextField
                      label={p.delPassword}
                      type="password"
                      value={password}
                      onChange={setPassword}
                      autoComplete="current-password"
                    />
                    {error && <ErrorNote>{error}</ErrorNote>}
                    <button
                      type="button"
                      onClick={verify}
                      disabled={busy || !studentId.trim() || !password}
                      className="w-full rounded-full bg-cream py-3 font-semibold text-forestdeep transition-all duration-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {busy ? p.delVerifying : p.delVerify}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/* ---------- ชิ้นส่วนที่ใช้ซ้ำในหน้านี้ ---------- */

function Card({
  children,
  id,
  danger,
}: {
  children: ReactNode;
  id?: string;
  /** กล่องลบบัญชี — ขอบแดงจาง ๆ ให้ต่างจากกล่องอ่านเฉย ๆ ที่เหลือ */
  danger?: boolean;
}) {
  return (
    <section
      id={id}
      /* scroll-mt = ชดเชยความสูงของแถบเมนูที่ fixed อยู่ ไม่งั้นกด #delete แล้ว
         หัวข้อไปโผล่ใต้แถบเมนูพอดี */
      className={`mt-9 scroll-mt-28 rounded-[26px] border p-6 shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-8 ${
        danger ? "border-danger/35 bg-ink/85" : "border-cream/15 bg-ink/78"
      }`}
    >
      {children}
    </section>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  const { lang } = useLang();
  return (
    <h2 className="text-[clamp(1.3rem,3vw,1.7rem)] text-cream" style={headingFont(lang, 1.3)}>
      {children}
    </h2>
  );
}

function Bullet({ children, tone }: { children: ReactNode; tone?: "muted" }) {
  return (
    <li className={`flex gap-2.5 text-sm leading-relaxed ${tone ? "text-cream/70" : "text-cream/80"}`}>
      <span className="mt-[0.55em] h-1 w-1 flex-none rounded-full bg-goldsoft/70" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[14px] border border-danger/40 bg-danger/20 px-4 py-3 text-sm text-[#ffc4c4]">
      {children}
    </p>
  );
}
