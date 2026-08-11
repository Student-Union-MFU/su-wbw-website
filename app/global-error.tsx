"use client";

/**
 * ด่านสุดท้าย — ทำงานเมื่อ app/layout.tsx เองพัง (LanguageProvider, ฉาก 3D, ฟอนต์)
 * ไฟล์นี้ "แทนที่" root layout ทั้งอัน จึงต้องมี <html> กับ <body> ของตัวเอง
 *
 * ทุกอย่างในนี้เขียนแบบพึ่งตัวเองล้วน:
 *   - ไม่ import globals.css เพราะสถานการณ์ที่หน้านี้โผล่คือ "ของที่ layout เตรียมไว้ใช้ไม่ได้"
 *     ใช้ inline style จึงแน่ใจว่าอ่านออกแม้ไฟล์ CSS โหลดไม่มา
 *   - ไม่ใช้ context ภาษา (มันอยู่ใน layout ที่พังไปแล้ว) จึงเขียนสองภาษาไว้เลย
 *   - ไม่ใช้ next/link — การเปลี่ยนหน้าแบบ client อาศัย router ที่อาจพังไปด้วย
 *
 * สีสองตัวนี้คือ --color-forestdeep กับ --color-cream ใน app/globals.css
 */
const GREEN = "#1b4332";
const CREAM = "#faf7f0";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="th">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem 1.5rem",
          background: GREEN,
          color: CREAM,
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "clamp(1.6rem, 5vw, 2.4rem)", lineHeight: 1.2 }}>
          เว็บไซต์ขัดข้อง
        </h1>
        <p style={{ margin: 0, fontSize: "0.95rem", opacity: 0.75 }}>Something went wrong</p>
        <p style={{ margin: "0.5rem 0 0", maxWidth: "30rem", fontSize: "0.9rem", lineHeight: 1.7, opacity: 0.8 }}>
          ลองโหลดหน้าใหม่อีกครั้ง ถ้ายังไม่ได้ให้แจ้งทีมงานพร้อมรหัสอ้างอิงด้านล่าง
          <br />
          Please try again. If it keeps happening, send the reference code below to the team.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center", marginTop: "1rem" }}>
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              border: 0,
              borderRadius: 999,
              padding: "0.75rem 2rem",
              background: CREAM,
              color: GREEN,
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ลองใหม่ · Try again
          </button>
          {/* <a> ธรรมดา = โหลดหน้าใหม่ทั้งหน้า ไม่พึ่ง router ที่อาจพังอยู่ */}
          <a
            href="/landing"
            style={{
              borderRadius: 999,
              border: `1px solid ${CREAM}40`,
              padding: "0.75rem 2rem",
              color: CREAM,
              fontSize: "0.9rem",
              textDecoration: "none",
            }}
          >
            กลับหน้าแรก · Home
          </a>
        </div>

        {error.digest && (
          <p style={{ marginTop: "1.5rem", fontFamily: "ui-monospace, monospace", fontSize: "0.7rem", opacity: 0.45 }}>
            {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
