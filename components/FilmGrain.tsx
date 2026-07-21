/**
 * เกรนฟิล์มจาง ๆ ทับพื้นเข้ม — ใช้ร่วมกันระหว่างหน้า landing กับหัวหน้าสมัคร
 * ให้พื้นสีเรียบ ๆ ไม่แบนจนเกินไป · เป็น SVG inline ไม่มีการเคลื่อนไหว
 */
export default function FilmGrain() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.15] mix-blend-overlay"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
      }}
    />
  );
}
