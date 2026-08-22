"use client";

/**
 * ข้อความของหน้าเอกสาร (/privacy, /support) — รองรับแค่สองอย่างคือ **ตัวหนา**
 * กับอีเมลที่กดแล้วเปิดแอปเมล
 *
 * ทำไมไม่ลาก markdown ทั้งก้อนเข้ามา: เนื้อหาสองหน้านี้ใช้แค่นี้จริง ๆ และข้อความ
 * มาจาก dictionaries.ts ที่เราคุมเอง ไม่ใช่ของผู้ใช้ — เพิ่ม dependency ไม่คุ้ม
 */

/** อีเมลเดียวของกิจกรรม — นโยบายข้อ 6 สัญญาว่าลบบัญชีให้ภายใน 7 วันผ่านช่องทางนี้
    เขียนไว้ที่เดียว ทุกหน้าที่เอ่ยถึงมันจะได้เป็นลิงก์ mailto เหมือนกันหมด */
export const EMAIL = "student-union@lamduan.mfu.ac.th";

/** ทำอีเมลในข้อความให้กดได้ — คนอ่านบนมือถือจะได้ไม่ต้องพิมพ์เอง */
export function withEmailLink(text: string): React.ReactNode[] {
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

export default function Rich({ text }: { text: string }) {
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
