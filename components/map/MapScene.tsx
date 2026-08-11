"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Line, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { CAMPUS_ROUTE } from "./campusRoute";

/**
 * แผนที่ 3D ของพื้นที่รอบมหาวิทยาลัย — โมเดลส่งออกจาก maps3d.io
 *
 * ไฟล์ต้นทางเป็น .obj 272 MB (3.5 ล้านจุด) ซึ่งส่งให้เบราว์เซอร์ตรง ๆ ไม่ได้
 * จึงแปลงเป็น .glb + บีบด้วย meshopt/WebP เหลือ ~10 MB (ดู public/models/CREDITS.md)
 *
 * Canvas ตัวนี้เป็นคนละตัวกับฉากป่าใน SceneHost โดยตั้งใจ — คนละฉาก คนละกล้อง
 * และหน้านี้เป็นหน้าเดียวที่ใช้ · ออกจากหน้าแล้ว context ถูกคืนไปตามปกติ
 *
 * หน่วยในโมเดลเป็นเมตร ขนาดจริง ~4.5 x 5.2 กม. สูงสุด ~320 ม.
 * (ดู metadata.json ของไฟล์ส่งออก) จึงต้องดัน far plane ไปไกลกว่าฉากอื่นมาก
 */

const MODEL = "/models/mfu-map.glb";

/** ยกเส้นทางลอยเหนือผิวถนนเล็กน้อย — วางระดับเดียวกับพื้นเมื่อไหร่เป็น z-fighting ทันที */
const ROUTE_LIFT = 6;

function CampusRoute() {
  // ปิดวงด้วยการต่อจุดแรกไว้ท้ายสุด (ข้อมูลเก็บเป็นวงเปิดไว้ไม่ให้จุดซ้ำ)
  const points = useMemo(
    () => [...CAMPUS_ROUTE, CAMPUS_ROUTE[0]].map(([x, y, z]) => new THREE.Vector3(x, y + ROUTE_LIFT, z)),
    [],
  );
  return (
    <>
      {/* เส้นขอบเข้มข้างล่าง + เส้นสว่างข้างบน = อ่านออกทั้งบนพื้นสว่างและในเงา
          เลิกใช้สีเขียว: พื้นแผนที่เป็นป่าเขียวเกือบทั้งจอ เส้นเขียวเลยจมหาย
          ส้มอำพันตัดกับเขียวแรงที่สุด และยังอยู่ในโทนทอง (gold) ของเว็บ */}
      <Line points={points} color="#2b1400" lineWidth={9} transparent opacity={0.6} />
      <Line points={points} color="#ffb02e" lineWidth={4} />
    </>
  );
}

function MapModel() {
  // useDraco=false — ไฟล์บีบด้วย meshopt ไม่ใช่ draco และตัว decoder ของ draco
  // ใน drei ชี้ไป CDN ของ google เป็นค่าเริ่มต้น ซึ่งเว็บนี้ไม่พึ่งของนอก
  const { scene } = useGLTF(MODEL, false, true);
  return <primitive object={scene} />;
}

export default function MapScene() {
  return (
    <Canvas
      // logarithmicDepthBuffer: ฉากกว้างหลายกิโลเมตรแต่ต้องเห็นอาคารสูงไม่กี่เมตร
      // depth buffer ปกติจะ z-fighting จนผิวพื้นลายพร้อย
      gl={{ antialias: true, logarithmicDepthBuffer: true }}
      camera={{ position: [0, 2600, 3800], fov: 45, near: 5, far: 40000 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NoToneMapping; // ภาพถ่ายดาวเทียมมีแสงอยู่ในเนื้อภาพแล้ว
      }}
      dpr={[1, 1.75]}
    >
      {/* แสงนุ่ม ๆ พอให้ด้านข้างอาคารไม่ดำสนิท — ตัวพื้นเป็นภาพถ่ายอยู่แล้ว
          จึงไม่ต้องจัดแสงจริงจัง ยิ่งสว่างมากยิ่งล้างรายละเอียดในภาพ */}
      <hemisphereLight args={["#ffffff", "#5b6b57", 2.2]} />
      <directionalLight position={[2500, 4000, 1500]} intensity={1.6} />

      <Suspense fallback={null}>
        {/* Bounds + fit = จัดกล้องให้พอดีกับกล่องของโมเดลจริง ๆ ไม่ต้องเดาระยะเอง */}
        <Bounds fit clip observe margin={1.15}>
          <MapModel />
        </Bounds>
        {/* อยู่นอก <Bounds> — ไม่งั้นกล้องจะเล็งพอดีกับ "เส้นทาง" แทนที่จะเป็นทั้งแผนที่ */}
        <CampusRoute />
      </Suspense>

      <OrbitControls
        makeDefault
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.08}
        // กันกล้องมุดลงใต้พื้น (เห็นหลังผิวโมเดลแล้วงง) และกันซูมทะลุ/ถอยหลุดโลก
        maxPolarAngle={Math.PI / 2.05}
        minDistance={300}
        maxDistance={12000}
        zoomSpeed={0.8}
      />
    </Canvas>
  );
}

useGLTF.preload(MODEL, false, true);
