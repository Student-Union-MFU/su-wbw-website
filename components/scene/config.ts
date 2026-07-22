/**
 * ค่าคงที่ของฉากป่าที่ใช้ร่วมกัน — โมดูลนี้ห้ามแตะ three.js เพื่อให้ import
 * เข้าฝั่งไหนก็ได้ (หน้า/overlay ที่ SSR) โดยไม่ลาก WebGL เข้า server bundle
 */
import { curve, zAt } from "@/components/landing/trail";

/** จุดที่กล้อง "ยืน" บนเส้นทาง (โหมด park — ทุกหน้าที่ไม่ใช่ landing) */
export const PARK_P = 0.28;

const CAM_Z = zAt(PARK_P);

/** ต้นไม้ประจำผู้สมัคร — ข้างหน้าเยื้องซ้าย (ดูเหตุผลตัวเลขใน ForestScene เดิม) */
export const PLANT_Z = CAM_Z - 6.0;
export const PLANT_X = curve(PLANT_Z) - 2.9;

/**
 * ถางที่รอบต้นไม้ให้โล่ง — ใช้ "ตลอด" ไม่ผูกกับว่ามีต้นไม้หรือไม่
 * เพราะฉากเป็น instance เดียวที่อยู่ข้ามหน้า · ถ้าเปลี่ยน clearing ตามหน้า
 * useLayout จะ re-scatter ต้นไม้ทั้งป่าใหม่ทุกครั้งที่เปลี่ยนหน้า = กระตุก
 * ปล่อยให้มีที่โล่งเล็ก ๆ ตรงนี้ตลอดไม่เสียหาย (ไม่มีต้นไม้ในหน้าอื่นก็แค่ที่ว่าง)
 */
export const CLEARING = { x: PLANT_X, z: PLANT_Z, r: 3.2 };
