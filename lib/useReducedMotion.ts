"use client";

import { useSyncExternalStore } from "react";

/**
 * ผู้ใช้ขอให้ลดการเคลื่อนไหวไหม — อ่านผ่าน useSyncExternalStore
 * (อ่านตอน render ตรง ๆ ไม่ได้ เพราะ server ไม่มี matchMedia)
 */

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}
function getServerSnapshot() {
  return false;
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
