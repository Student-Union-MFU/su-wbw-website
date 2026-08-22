"use client";

import ForestScene from "@/components/ForestScene";
import { headingFont, useLang } from "@/lib/i18n/LanguageProvider";
import { DAY_STILL } from "@/lib/dayCycle";

/** อีเมลเดียวของนโยบาย — ข้อ 6 สัญญาว่าลบบัญชีให้ภายใน 7 วันผ่านช่องทางนี้
    เขียนไว้ที่เดียว หน้าเว็บจะได้ทำเป็นลิงก์ mailto ให้ทุกที่ที่ข้อความเอ่ยถึงมัน */
const EMAIL = "student-union@lamduan.mfu.ac.th";

/** ทำอีเมลในข้อความให้กดได้ — คนอ่านนโยบายบนมือถือจะได้ไม่ต้องพิมพ์เอง */
function withEmailLink(text: string): React.ReactNode[] {
  return text.split(EMAIL).flatMap((chunk, i) =>
    i === 0
      ? [chunk]
      : [
          <a
            key={`m${i}`}
            href={`mailto:${EMAIL}`}
            className="underline decoration-goldsoft/60 underline-offset-2 hover:text-goldsoft"
          >
            {EMAIL}
          </a>,
          chunk,
        ],
  );
}

/** ตัวหนาแบบ **...** ในข้อความนโยบาย — เขียนเองแทนลาก markdown ทั้งก้อนเข้ามา
    เพราะเนื้อหาชุดนี้ใช้แค่ตัวหนากับอีเมลสองอย่างเท่านั้น */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split("**").map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-cream">
            {withEmailLink(part)}
          </strong>
        ) : (
          <span key={i}>{withEmailLink(part)}</span>
        ),
      )}
    </>
  );
}

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
      </main>
    </>
  );
}
