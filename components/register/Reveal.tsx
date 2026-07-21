"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * ห่อ element ให้ fade + เลื่อนขึ้นตอน scroll เข้า viewport (ครั้งเดียว)
 * เคารพ prefers-reduced-motion (โชว์ทันที ไม่มีการเคลื่อน)
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        // เลื่อนขึ้นครั้งเดียวนุ่มๆ แบบการ์ด milli (travel เยอะ + ease-out แรง)
        transform: shown ? "translateY(0)" : "translateY(54px)",
        transition: `opacity 0.8s ease ${delay}ms, transform 0.85s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
