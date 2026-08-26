"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import ForestScene from "@/components/ForestScene";
import Rich from "@/components/RichText";
import { TextField } from "@/components/register/ui";
import { deleteMyAccount, login } from "@/lib/adminApi";
import { headingFont, useLang } from "@/lib/i18n/LanguageProvider";
import { DAY_STILL } from "@/lib/dayCycle";
import { isStaff, useSession } from "@/lib/session";

export default function PrivacyPage() {
  const { t, lang } = useLang();
  const p = t.privacy;
  return (
    <>
      <ForestScene day={DAY_STILL} focus="center" />
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-24 pt-28 sm:pt-32">
        <header className="text-center">
          <p className="text-[10px] uppercase tracking-[0.42em] text-goldsoft sm:text-xs">
            {p.eyebrow}
          </p>
          <h1
            className="mt-4 text-[clamp(2rem,5vw,3.4rem)] leading-[1.05] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
            style={headingFont(lang, 1.25)}
          >
            {p.heading}
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base text-cream/85">{p.lead}</p>
          <p className="mt-2 text-xs text-cream/55">{p.updated}</p>
          {/* ทางลัดลงไปส่วนลบบัญชี — คนที่เปิดหน้านี้เพราะอยากลบไม่ต้องเลื่อนผ่าน
              นโยบายทั้งหมด (ผู้ตรวจของ App Store ก็ใช้ทางลัดนี้เหมือนกัน) · เป็นปุ่ม
              ขอบแดง ไม่ใช่ลิงก์ข้อความ เพราะทั้งหน้ามีอยู่ทางเดียวที่นำไปสู่การกระทำ
              ที่ย้อนกลับไม่ได้ · พื้นแดงทึบสงวนไว้ให้ปุ่มที่ "ลบจริง" ปุ่มเดียว */}
          <a
            href="#delete"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-danger/60 bg-danger/12 px-6 py-2.5 text-sm font-semibold text-[#ffb4b4] transition-all duration-200 hover:-translate-y-0.5 hover:border-danger hover:bg-danger/20 hover:text-white"
          >
            {p.jumpToDelete}
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
              <path d="M6 1v11M1.5 8 6 12.5 10.5 8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </header>

        <article className="mt-9 rounded-[26px] border border-cream/15 bg-ink/78 p-6 shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-9">
          {p.sections.map((s) => (
            <section key={s.title} className="mt-10 first:mt-0">
              <h2
                className="text-xl text-goldsoft sm:text-2xl"
                style={headingFont(lang, 1.15)}
              >
                {s.title}
              </h2>

              <div className="mt-4 space-y-4 text-sm leading-relaxed text-cream/85 sm:text-[15px]">
                {s.paras.map((text, i) => (
                  <p key={`p${i}`}>
                    <Rich text={text} />
                  </p>
                ))}
              </div>

              {s.table && (
                /* ตารางกว้างกว่าจอมือถือเสมอ — ให้เลื่อนในกล่องของตัวเอง ไม่ใช่ทั้งหน้า */
                <div className="mt-5 -mx-2 overflow-x-auto px-2">
                  <table className="w-full min-w-[34rem] border-collapse text-left text-sm text-cream/85">
                    <thead>
                      <tr className="border-b border-cream/20">
                        {s.table.head.map((h) => (
                          <th
                            key={h}
                            className="py-2 pr-4 text-[11px] uppercase tracking-[0.16em] text-cream/55"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.table.rows.map((row, i) => (
                        <tr key={`r${i}`} className="border-b border-cream/10 align-top">
                          {row.map((cell, j) => (
                            <td key={`c${j}`} className="py-3 pr-4 leading-relaxed">
                              <Rich text={cell} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {s.bullets.length > 0 && (
                <ul className="mt-4 space-y-3 text-sm leading-relaxed text-cream/85 sm:text-[15px]">
                  {s.bullets.map((text, i) => (
                    <li key={`b${i}`} className="relative pl-5">
                      <span className="absolute left-0 top-[0.6em] h-1.5 w-1.5 rounded-full bg-goldsoft" />
                      <Rich text={text} />
                    </li>
                  ))}
                </ul>
              )}

              {s.after.length > 0 && (
                <div className="mt-4 space-y-4 text-sm leading-relaxed text-cream/85 sm:text-[15px]">
                  {s.after.map((text, i) => (
                    <p key={`a${i}`}>
                      <Rich text={text} />
                    </p>
                  ))}
                </div>
              )}
            </section>
          ))}

          <p className="mt-10 border-t border-cream/12 pt-5 text-xs leading-relaxed text-cream/55">
            {p.note}
          </p>
        </article>

        {/* ---------- ลบบัญชี ---------- */}
        <DeleteSection />
      </main>
    </>
  );
}

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

/* ---------- ชิ้นส่วนที่ใช้ซ้ำในส่วนลบบัญชี ---------- */

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

