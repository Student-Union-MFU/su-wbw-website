"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { Model, useNormalized } from "@/components/landing/models";
import { HEIGHT, groundHeight, lerp } from "@/components/landing/trail";

/**
 * ต้นไม้ประจำผู้สมัคร — โตขึ้นหนึ่งระยะต่อหนึ่ง step ของฟอร์ม
 *
 * ใช้ tree.glb ต้นเดียวกับป่ารอบ ๆ แล้วไล่ขนาดเอา (เคยลองสลับเป็นโมเดลคนละตัว
 * ต่อระยะแล้ว — สไตล์ไม่เข้ากับฉาก เลยกลับมาใช้วิธีนี้) ข้อดีคือกลมกลืนกับป่า
 * แน่นอน และไม่ต้องโหลดไฟล์เพิ่มเลยสักไบต์
 *
 * normalize ไว้ที่ความสูง 1 หน่วยแล้วคุมขนาดด้วย group.scale ทุกเฟรม —
 * ห้ามส่งความสูงที่เปลี่ยนทุกเฟรมเข้า useNormalized() เพราะ memo คิดจาก
 * targetHeight มันจะ clone โมเดลใหม่ทุกเฟรม
 */

/**
 * ความสูงปลายทางของแต่ละระยะ (หน่วยฉาก)
 *
 * จูนไว้สำหรับระยะห่าง 6 หน่วย (ดู ForestScene) — ที่ fov 55° ความสูงที่
 * มองเห็นตรงนั้นราว 6.2 หน่วย ค่าชุดนี้จึงกินพื้นที่จอราว 11% → 21% → 35% →
 * 54% → 80% ของความสูงจอ · ระยะแรกเล็กแต่ยังเห็นชัด ระยะสุดท้ายไม่ล้นจอ
 */
const PHASE_HEIGHTS = [0.7, 1.3, 2.2, 3.4, 5.0];

/** กอหญ้าโคนต้น — ช่วยให้ต้นไม้ดู "ปลูกอยู่บนพื้น" ไม่ใช่วางทับ */
const TUFTS = [
  { dx: -0.9, dz: 0.5, rot: 0.4 },
  { dx: 0.8, dz: 0.9, rot: 2.1 },
  { dx: 0.3, dz: -0.85, rot: 4.0 },
  { dx: -0.5, dz: -1.1, rot: 5.2 },
];

export default function GrowingPlant({
  step,
  x,
  z,
  reduced,
}: {
  step: number;
  x: number;
  z: number;
  reduced: boolean;
}) {
  const obj = useNormalized("/models/tree.glb", 1);
  const group = useRef<THREE.Group>(null);
  const height = useRef<number>(PHASE_HEIGHTS[0]);

  const y = useMemo(() => groundHeight(x, z), [x, z]);
  const target = PHASE_HEIGHTS[Math.min(Math.max(step, 0), PHASE_HEIGHTS.length - 1)];

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;

    // ค่อย ๆ โต ไม่กระโดดทันทีที่กด "ถัดไป"
    height.current = reduced ? target : lerp(height.current, target, Math.min(1, dt * 1.7));
    g.scale.setScalar(height.current);

    // ไหวตามลม — ต้นเล็กไหวมาก ต้นใหญ่แทบไม่ไหว
    if (!reduced) {
      const t = state.clock.elapsedTime;
      const amp = 0.05 / (1 + height.current * 0.8);
      g.rotation.z = Math.sin(t * 0.9) * amp;
      g.rotation.x = Math.sin(t * 0.72 + 1.3) * amp * 0.6;
    }
  });

  return (
    <>
      <group position={[x, y, z]}>
        <group ref={group} scale={height.current}>
          <primitive object={obj} />
        </group>
      </group>

      {TUFTS.map((t, i) => {
        const gx = x + t.dx;
        const gz = z + t.dz;
        return (
          <Model
            key={i}
            url="/models/grass.glb"
            height={HEIGHT.grass * 1.6}
            position={[gx, groundHeight(gx, gz), gz]}
            rotation={t.rot}
          />
        );
      })}
    </>
  );
}
