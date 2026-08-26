"use client";

/**
 * บันทึกเวลากลุ่มเข้า/ออกฐาน — เวอร์ชัน local (localStorage) ยังไม่ผูก backend
 *
 * เก็บเป็น "visit": 1 รายการต่อ "กลุ่ม X อยู่ฐาน Y ครั้งหนึ่ง" (arrived_at → departed_at)
 * เวลาเดินระหว่างฐานไม่ถูกบันทึกตรงๆ แต่คำนวณจากช่องว่างระหว่าง departed_at ของ
 * visit ก่อนหน้า กับ arrived_at ของ visit ถัดไปในกลุ่มเดียวกัน — ไม่มีข้อมูลซ้ำซ้อนให้ขัดกัน
 * และ shape นี้ map เป็นตารางฐานข้อมูลได้ตรงๆ ถ้าจะย้ายขึ้น backend ภายหลัง
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type GroupTimeVisit = {
  id: string; // crypto.randomUUID()
  group_id: number;
  checkpoint_id: number;
  arrived_at: string; // ISO (new Date().toISOString())
  departed_at: string | null; // null = ยังอยู่ที่ฐาน
};

export type GroupTimeStore = { version: 1; visits: GroupTimeVisit[] };

// key มี version ต่อท้าย — ถ้า schema เปลี่ยนให้เขียน migration อ่าน v1 → เขียน v2 แทนการทับ
const KEY = "wbw.grouptime.v1";

const emptyStore = (): GroupTimeStore => ({ version: 1, visits: [] });

/** ตรวจว่า object ที่ parse มาเป็น store ที่ใช้ได้จริง (กัน import ไฟล์ขยะ/ข้อมูลเก่าพัง) */
export function isValidStore(v: unknown): v is GroupTimeStore {
  if (typeof v !== "object" || v === null) return false;
  const s = v as GroupTimeStore;
  return (
    s.version === 1 &&
    Array.isArray(s.visits) &&
    s.visits.every(
      (x) =>
        typeof x === "object" &&
        x !== null &&
        typeof x.id === "string" &&
        typeof x.group_id === "number" &&
        typeof x.checkpoint_id === "number" &&
        typeof x.arrived_at === "string" &&
        (x.departed_at === null || typeof x.departed_at === "string"),
    )
  );
}

export function loadStore(): GroupTimeStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const parsed: unknown = JSON.parse(raw);
    return isValidStore(parsed) ? parsed : emptyStore();
  } catch {
    return emptyStore();
  }
}

export function saveStore(store: GroupTimeStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // storage เต็ม/ถูกบล็อก — ปล่อยผ่าน state ใน memory ยังใช้ได้จนกว่าจะ refresh
  }
}

/* ---------- hook หลัก: state + write-through localStorage ---------- */

export function useGroupTime() {
  const [store, setStore] = useState<GroupTimeStore>(loadStore);
  // snapshot ก่อน mutation ล่าสุด — undo 1 ระดับ พอสำหรับกู้การกดพลาดหน้างาน
  const undoRef = useRef<GroupTimeStore | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  const commit = useCallback((next: GroupTimeStore, snapshotPrev: GroupTimeStore | null) => {
    undoRef.current = snapshotPrev;
    setCanUndo(snapshotPrev !== null);
    setStore(next);
    saveStore(next);
  }, []);

  const recordArrival = useCallback(
    (group_id: number, checkpoint_id: number) => {
      setStore((prev) => {
        // ถ้ากลุ่มยังมี visit ที่เปิดค้าง (ลืมกดออกจากฐาน) ให้ปิดด้วยเวลาปัจจุบันก่อน
        const now = new Date().toISOString();
        const visits = prev.visits.map((v) =>
          v.group_id === group_id && v.departed_at === null ? { ...v, departed_at: now } : v,
        );
        visits.push({ id: crypto.randomUUID(), group_id, checkpoint_id, arrived_at: now, departed_at: null });
        const next = { ...prev, visits };
        undoRef.current = prev;
        setCanUndo(true);
        saveStore(next);
        return next;
      });
    },
    [],
  );

  const recordDeparture = useCallback((group_id: number) => {
    setStore((prev) => {
      const now = new Date().toISOString();
      const next = {
        ...prev,
        visits: prev.visits.map((v) =>
          v.group_id === group_id && v.departed_at === null ? { ...v, departed_at: now } : v,
        ),
      };
      undoRef.current = prev;
      setCanUndo(true);
      saveStore(next);
      return next;
    });
  }, []);

  const updateVisit = useCallback((id: string, patch: Partial<Pick<GroupTimeVisit, "arrived_at" | "departed_at" | "checkpoint_id">>) => {
    setStore((prev) => {
      const next = { ...prev, visits: prev.visits.map((v) => (v.id === id ? { ...v, ...patch } : v)) };
      undoRef.current = prev;
      setCanUndo(true);
      saveStore(next);
      return next;
    });
  }, []);

  const deleteVisit = useCallback((id: string) => {
    setStore((prev) => {
      const next = { ...prev, visits: prev.visits.filter((v) => v.id !== id) };
      undoRef.current = prev;
      setCanUndo(true);
      saveStore(next);
      return next;
    });
  }, []);

  const undoLast = useCallback(() => {
    const snap = undoRef.current;
    if (!snap) return;
    commit(snap, null);
  }, [commit]);

  const replaceAll = useCallback(
    (next: GroupTimeStore) => {
      setStore((prev) => {
        undoRef.current = prev;
        setCanUndo(true);
        saveStore(next);
        return next;
      });
    },
    [],
  );

  const clearAll = useCallback(() => {
    setStore((prev) => {
      undoRef.current = prev;
      setCanUndo(true);
      const next = emptyStore();
      saveStore(next);
      return next;
    });
  }, []);

  return { store, canUndo, recordArrival, recordDeparture, updateVisit, deleteVisit, undoLast, replaceAll, clearAll };
}

/* ---------- ฟังก์ชัน pure สำหรับคำนวณ (รับ visits ตรงๆ เทสง่าย/ย้ายง่าย) ---------- */

export type WalkSegment = { from_checkpoint_id: number; to_checkpoint_id: number; departed_at: string; arrived_at: string; ms: number };
export type TimelineEntry =
  | { kind: "visit"; visit: GroupTimeVisit; dwellMs: number | null } // dwellMs = null ถ้ายังไม่ออกจากฐาน
  | { kind: "walk"; walk: WalkSegment };

/** visits ของกลุ่มเรียงตามเวลาเข้า + แทรกช่วงเดินที่คำนวณระหว่างคู่ที่ปิดแล้ว */
export function groupTimeline(visits: GroupTimeVisit[], group_id: number): TimelineEntry[] {
  const own = visits
    .filter((v) => v.group_id === group_id)
    .slice()
    .sort((a, b) => a.arrived_at.localeCompare(b.arrived_at)); // ISO UTC เทียบเป็น string ได้เลย
  const out: TimelineEntry[] = [];
  own.forEach((v, i) => {
    if (i > 0) {
      const prev = own[i - 1];
      if (prev.departed_at) {
        const ms = Date.parse(v.arrived_at) - Date.parse(prev.departed_at);
        if (ms >= 0) {
          out.push({
            kind: "walk",
            walk: { from_checkpoint_id: prev.checkpoint_id, to_checkpoint_id: v.checkpoint_id, departed_at: prev.departed_at, arrived_at: v.arrived_at, ms },
          });
        }
      }
    }
    const dwellMs = v.departed_at ? Date.parse(v.departed_at) - Date.parse(v.arrived_at) : null;
    out.push({ kind: "visit", visit: v, dwellMs });
  });
  return out;
}

export type GroupStatus =
  | { kind: "idle" }
  | { kind: "atBase"; checkpoint_id: number; since: string }
  | { kind: "walking"; since: string; lastCheckpoint_id: number };

export function groupStatus(visits: GroupTimeVisit[], group_id: number): GroupStatus {
  const own = visits.filter((v) => v.group_id === group_id).slice().sort((a, b) => a.arrived_at.localeCompare(b.arrived_at));
  if (own.length === 0) return { kind: "idle" };
  const last = own[own.length - 1];
  if (last.departed_at === null) return { kind: "atBase", checkpoint_id: last.checkpoint_id, since: last.arrived_at };
  return { kind: "walking", since: last.departed_at, lastCheckpoint_id: last.checkpoint_id };
}

/** ฐานถัดไปที่ควรแนะนำ: ฐานแรกใน checkpoints (เรียง sequence แล้ว) ที่กลุ่มยังไม่เคยเข้า · เข้าไปครบแล้วคืน null */
export function suggestNextCheckpoint(visits: GroupTimeVisit[], group_id: number, orderedCheckpointIds: number[]): number | null {
  const visited = new Set(visits.filter((v) => v.group_id === group_id).map((v) => v.checkpoint_id));
  return orderedCheckpointIds.find((id) => !visited.has(id)) ?? null;
}

/** รวมเวลาในฐาน vs เวลาเดินของกลุ่ม (นับเฉพาะช่วงที่ปิดแล้ว) */
export function perGroupTotals(visits: GroupTimeVisit[], group_id: number): { dwellMs: number; walkMs: number } {
  let dwellMs = 0;
  let walkMs = 0;
  for (const e of groupTimeline(visits, group_id)) {
    if (e.kind === "visit" && e.dwellMs !== null) dwellMs += e.dwellMs;
    if (e.kind === "walk") walkMs += e.walk.ms;
  }
  return { dwellMs, walkMs };
}

/** ค่าเฉลี่ยเวลาอยู่ในฐานต่อฐาน (เฉพาะ visit ที่ปิดแล้ว) + จำนวนกลุ่มที่ผ่าน */
export function perBaseAverages(visits: GroupTimeVisit[]): Map<number, { avgMs: number; count: number }> {
  const sums = new Map<number, { total: number; count: number }>();
  for (const v of visits) {
    if (!v.departed_at) continue;
    const ms = Date.parse(v.departed_at) - Date.parse(v.arrived_at);
    if (ms < 0) continue;
    const cur = sums.get(v.checkpoint_id) ?? { total: 0, count: 0 };
    sums.set(v.checkpoint_id, { total: cur.total + ms, count: cur.count + 1 });
  }
  const out = new Map<number, { avgMs: number; count: number }>();
  sums.forEach((s, id) => out.set(id, { avgMs: s.total / s.count, count: s.count }));
  return out;
}

/** เวลาที่กลุ่มอยู่ในฐานหนึ่งๆ รวมทุก visit ที่ปิดแล้ว (ใช้ในตาราง summary) */
export function dwellAtBase(visits: GroupTimeVisit[], group_id: number, checkpoint_id: number): number | null {
  let total = 0;
  let found = false;
  for (const v of visits) {
    if (v.group_id !== group_id || v.checkpoint_id !== checkpoint_id || !v.departed_at) continue;
    const ms = Date.parse(v.departed_at) - Date.parse(v.arrived_at);
    if (ms >= 0) {
      total += ms;
      found = true;
    }
  }
  return found ? total : null;
}

/** tick เพื่อให้ตัวเลข "ผ่านไปแล้ว X นาที" เดินสดๆ โดยไม่ต้อง re-render ถี่เกิน */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}
