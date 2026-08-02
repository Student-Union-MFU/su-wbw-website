"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { dictionaries, type Dict, type Lang } from "./dictionaries";

const STORAGE_KEY = "wbw-lang";

/* ============================================================
   localStorage เป็น "external store" — อ่านผ่าน useSyncExternalStore
   ไม่ใช่ useState + useEffect เพราะ setState ใน effect ทำให้ render ซ้อน
   (และ eslint react-hooks/set-state-in-effect ฟ้อง)
   ============================================================ */

function readLang(): Lang {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "en" || saved === "th") return saved;
  // ยังไม่เคยเลือก → เดาจากภาษาเบราว์เซอร์ (ไม่ใช่ไทย = อังกฤษ)
  return navigator.language.toLowerCase().startsWith("th") ? "th" : "en";
}

// snapshot ต้องคงที่ระหว่าง render — cache ไว้ แล้ว invalidate ตอนค่าเปลี่ยน
let cached: Lang | null = null;
const listeners = new Set<() => void>();

function handleStorage(e: StorageEvent) {
  // e.key === null คือ localStorage.clear()
  if (e.key !== null && e.key !== STORAGE_KEY) return;
  cached = readLang();
  listeners.forEach((cb) => cb());
}

function subscribe(cb: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", handleStorage);
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) window.removeEventListener("storage", handleStorage);
  };
}

function getSnapshot(): Lang {
  if (cached === null) cached = readLang();
  return cached;
}

/* SSR/prerender เป็นไทยเสมอ (หน้านี้ prerender เป็น static)
   React จะ re-render ด้วยค่าจริงหลัง hydrate — ไม่เกิด hydration mismatch */
function getServerSnapshot(): Lang {
  return "th";
}

function writeLang(l: Lang) {
  cached = l;
  window.localStorage.setItem(STORAGE_KEY, l);
  listeners.forEach((cb) => cb());
}

type LanguageContextValue = {
  lang: Lang;
  /** พจนานุกรมของภาษาปัจจุบัน */
  t: Dict;
  setLang: (l: Lang) => void;
  toggle: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLang = useCallback((l: Lang) => writeLang(l), []);

  // ไม่มี /en ใน URL → ต้องอัปเดต lang กับ title ของเอกสารเอง
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = dictionaries[lang].meta.title;
  }, [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      t: dictionaries[lang],
      setLang,
      toggle: () => setLang(lang === "th" ? "en" : "th"),
    }),
    [lang, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang ต้องอยู่ภายใน <LanguageProvider>");
  return ctx;
}

/** ทางลัดเมื่อต้องการแค่คำแปล */
export function useT() {
  return useLang().t;
}

/* ฟอนต์หัวเรื่องตามภาษา — TH: Kanit / EN: Bebas Neue (ตัวพิมพ์ใหญ่ล้วน ไม่มี glyph ไทย)
   thLineHeight: override leading-* ที่แน่นเกินไปสำหรับสระบน/วรรณยุกต์ไทยของ Kanit
   (inline style ชนะ class · undefined = ไม่ override ใช้ leading เดิม) */
export function headingFont(lang: Lang, thLineHeight?: number): CSSProperties {
  return lang === "th"
    ? { fontFamily: "var(--font-kanit)", lineHeight: thLineHeight }
    : { fontFamily: "var(--font-bebas)", letterSpacing: "0.02em" };
}
