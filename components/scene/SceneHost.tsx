"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { DAY_STILL } from "@/lib/dayCycle";

/**
 * เจ้าของ "Canvas เดียว" ของทั้งเว็บ — วางไว้ใน layout จึงไม่ unmount ตอนเปลี่ยนหน้า
 *
 * ทำไม: เดิมทุกหน้ามี <Canvas> ของตัวเอง เปลี่ยนหน้าทีนึง WebGL ถูกทำลายแล้ว
 * สร้างใหม่ (โหลดโมเดล/สร้าง scene graph ใหม่) = จอเขียว ๆ แวบ + เปลืองหน่วยความจำ
 * ตอนนี้ Canvas เดียวอยู่ตลอด · แต่ละหน้าแค่ "สั่ง" ค่ากล้อง/แสง/ต้นไม้ผ่าน context
 */

const PersistentScene = dynamic(() => import("./PersistentScene"), { ssr: false });

/** สิ่งที่หน้าต่าง ๆ สั่งเข้ามาคุมฉาก */
type SceneConfig = {
  /** โชว์ฉากไหม · หน้าที่ไม่ใช้ฉาก (map, แดชบอร์ด) = false → ซ่อน + หยุด render */
  enabled: boolean;
  /** undefined = โหมดเดิน (landing) · ตัวเลข = ยืนอยู่กับที่ */
  parkAt?: number;
  /** ระยะต้นไม้ (หน้าสมัคร) · undefined = ไม่มีต้นไม้ */
  plantStep?: number;
};

type SceneApi = {
  /** ref คุมฉาก: โหมดเดิน = ความคืบหน้า scroll · โหมดยืน = ช่วงเวลาของวัน */
  progress: RefObject<number>;
  reduced: boolean;
  /** อัปเดตค่าฉากแบบ merge — หน้าเรียกตอน mount/เปลี่ยน step, และปิดตอน unmount */
  setConfig: (patch: Partial<SceneConfig>) => void;
};

const SceneContext = createContext<SceneApi | null>(null);

export function useScene(): SceneApi {
  const api = useContext(SceneContext);
  if (!api) throw new Error("useScene ต้องอยู่ภายใน <SceneHost>");
  return api;
}

export default function SceneHost({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const progress = useRef<number>(DAY_STILL);
  const [config, setConfigState] = useState<SceneConfig>({ enabled: false });
  // mount Canvas ครั้งแรกที่มีหน้าขอใช้ฉาก แล้วคงไว้ตลอด (คนที่เข้า /map ก่อน
  // จะไม่จุด WebGL โดยเปล่าประโยชน์ · พอไปหน้าที่ใช้ฉากค่อย mount แล้วอยู่ยาว)
  const [everEnabled, setEverEnabled] = useState(false);

  const setConfig = useMemo(
    () => (patch: Partial<SceneConfig>) => setConfigState((c) => ({ ...c, ...patch })),
    [],
  );

  useEffect(() => {
    if (config.enabled) setEverEnabled(true);
  }, [config.enabled]);

  const api = useMemo<SceneApi>(() => ({ progress, reduced, setConfig }), [reduced, setConfig]);

  return (
    <SceneContext.Provider value={api}>
      {/* Canvas ตรึงเต็มจอหลังทุกอย่าง (z-0) · ซ่อนด้วย opacity/visibility เมื่อไม่ใช้
          (ไม่ unmount เพื่อไม่ให้ต้องสร้าง WebGL ใหม่) */}
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-forestdeep transition-opacity duration-300"
        style={{ opacity: config.enabled ? 1 : 0, visibility: config.enabled ? "visible" : "hidden" }}
        aria-hidden
      >
        {everEnabled && (
          <PersistentScene
            progress={progress}
            reduced={reduced}
            parkAt={config.parkAt}
            plantStep={config.plantStep}
            active={config.enabled}
          />
        )}
      </div>

      {children}
    </SceneContext.Provider>
  );
}
