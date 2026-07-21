"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * ตัวช่วยโหลด/วางโมเดล glTF
 *
 * โมเดลที่โหลดมาจากหลายแหล่ง (ดู public/models/CREDITS.md) ขนาด/จุดหมุนไม่ตรงกันเลย
 * เลย normalize ด้วย Box3 ตอน runtime แทนการ hardcode scale ของแต่ละไฟล์ —
 * เปลี่ยนไฟล์โมเดลทีหลังไม่ต้องมานั่งจูนตัวเลขใหม่
 */

export type Placement = {
  x: number;
  z: number;
  y?: number;
  scale?: number;
  rot?: number;
};

/** clone โมเดล + ย่อ/ขยายให้สูงตามที่ขอ และวางให้ฐานแตะ y=0 */
export function useNormalized(url: string, targetHeight: number) {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const obj = scene.clone(true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const s = targetHeight / (size.y || 1);
    obj.scale.setScalar(s);
    obj.position.y = -box.min.y * s;
    // จัดกึ่งกลางแกน X/Z ให้จุดหมุนอยู่กลางโมเดล
    const center = new THREE.Vector3();
    box.getCenter(center);
    obj.position.x = -center.x * s;
    obj.position.z = -center.z * s;
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return obj;
  }, [scene, targetHeight]);
}

/** วางโมเดลเดี่ยว ๆ หนึ่งชิ้น */
export function Model({
  url,
  height,
  position,
  rotation = 0,
}: {
  url: string;
  height: number;
  position: [number, number, number];
  rotation?: number;
}) {
  const obj = useNormalized(url, height);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <primitive object={obj} />
    </group>
  );
}

/** ดึง (geometry, material) ของทุก mesh ในโมเดล พร้อม transform ของตัวเองในลำดับชั้น */
function useParts(url: string, targetHeight: number) {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const s = targetHeight / (size.y || 1);

    // จุดกึ่งกลางแกน X/Z ของโมเดล — หลายไฟล์ไม่ได้วางจุดหมุนไว้กลางตัว
    // (เช่น tree.glb เยื้องไป -30.8 หน่วย = ~0.45 หน่วยหลัง normalize)
    // ถ้าไม่หักออก ทุก instance จะเลื่อนหนีจากพิกัดที่สั่งไว้ → ต้นไม้ไปยืนอยู่บนทาง
    const center = new THREE.Vector3();
    box.getCenter(center);

    const parts: { geometry: THREE.BufferGeometry; material: THREE.Material; local: THREE.Matrix4 }[] =
      [];
    scene.updateWorldMatrix(true, true);
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      // ยุบ transform ของ node เข้าไปในเมทริกซ์ แล้วคูณสเกล + จัดกึ่งกลาง + ยกฐานแตะพื้น
      const local = new THREE.Matrix4()
        .makeScale(s, s, s)
        .multiply(m.matrixWorld.clone())
        .premultiply(
          new THREE.Matrix4().makeTranslation(-center.x * s, -box.min.y * s, -center.z * s),
        );
      parts.push({
        geometry: m.geometry,
        material: Array.isArray(m.material) ? m.material[0] : m.material,
        local,
      });
    });
    return parts;
  }, [scene, targetHeight]);
}

/**
 * วางโมเดลเดิมซ้ำหลายร้อยชิ้นด้วย InstancedMesh
 * (ต้นไม้/ก้อนหินริมทางมีเป็นร้อย — วางทีละ mesh จะกลายเป็นร้อย draw call)
 */
export function InstancedModel({
  url,
  height,
  items,
}: {
  url: string;
  height: number;
  items: Placement[];
}) {
  const parts = useParts(url, height);
  return (
    <>
      {parts.map((p, i) => (
        <InstancedPart key={i} part={p} items={items} />
      ))}
    </>
  );
}

function InstancedPart({
  part,
  items,
}: {
  part: { geometry: THREE.BufferGeometry; material: THREE.Material; local: THREE.Matrix4 };
  items: Placement[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const world = new THREE.Matrix4();
    items.forEach((it, i) => {
      world.compose(
        new THREE.Vector3(it.x, it.y ?? 0, it.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, it.rot ?? 0, 0)),
        new THREE.Vector3(it.scale ?? 1, it.scale ?? 1, it.scale ?? 1),
      );
      m.multiplyMatrices(world, part.local);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items, part]);

  return (
    <instancedMesh
      ref={ref}
      args={[part.geometry, part.material, items.length]}
      castShadow
      receiveShadow
    />
  );
}

/** โหลดล่วงหน้าทั้งชุด — กันฉากโผล่ทีละชิ้นตอนเดินไปเจอ */
export const MODEL_URLS = [
  "/models/tree.glb",
  "/models/rock-small.glb",
  "/models/rock-large.glb",
  "/models/mountain-snow.glb",
  "/models/mountain-ridge.glb",
  "/models/snowy-hills.glb",
  "/models/signpost.glb",
  "/models/grass.glb",
] as const;

MODEL_URLS.forEach((u) => useGLTF.preload(u));
