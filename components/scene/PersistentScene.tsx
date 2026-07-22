"use client";

import type { RefObject } from "react";
import TrailScene from "@/components/landing/TrailScene";
import GrowingPlant from "@/components/register/GrowingPlant";
import { PLANT_X, PLANT_Z, CLEARING } from "./config";

/**
 * ต้นไม้ + Canvas จริง — โมดูลนี้ลาก three.js เข้ามา จึงถูกโหลดแบบ dynamic(ssr:false)
 * จาก SceneHost เท่านั้น · mount ครั้งเดียวตลอดอายุแอป ไม่ teardown ตอนเปลี่ยนหน้า
 *
 * parkAt: undefined = โหมดเดิน (landing) · เป็นตัวเลข = ยืนอยู่กับที่ (หน้าอื่น)
 * plantStep: undefined = ไม่มีต้นไม้ · เป็นตัวเลข = ต้นไม้โตตาม step (หน้าสมัคร)
 * active: false เมื่อฉากถูกซ่อน (หน้าที่ไม่ใช้ฉาก) → หยุด render loop ประหยัดเครื่อง
 */
export default function PersistentScene({
  progress,
  reduced,
  parkAt,
  plantStep,
  active,
}: {
  progress: RefObject<number>;
  reduced: boolean;
  parkAt?: number;
  plantStep?: number;
  active: boolean;
}) {
  return (
    <TrailScene progress={progress} reduced={reduced} parkAt={parkAt} clearing={CLEARING} active={active}>
      {plantStep === undefined ? null : (
        <GrowingPlant step={plantStep} x={PLANT_X} z={PLANT_Z} reduced={reduced} />
      )}
    </TrailScene>
  );
}
