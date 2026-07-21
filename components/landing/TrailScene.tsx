"use client";

import { Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import * as THREE from "three";
import { InstancedModel, Model } from "./models";
import {
  CAM_START_Z,
  EYE_HEIGHT,
  GROUND_WIDTH,
  MARKER_Z,
  TRAIL_HALF,
  TRAIL_LENGTH,
  SILHOUETTE,
  FOOTPRINT,
  HEIGHT,
  PONDS,
  clearanceRadius,
  curve,
  footRadius,
  groundHeight,
  lowestGroundIn,
  makeScatter,
  pondWaterLevel,
  lerp,
  mulberry32,
  sunAt,
  sunVector,
  zAt,
} from "./trail";

/**
 * ฉาก 3D เต็มหน้า — เดินไปตามเส้นทางรอบดอยตาม scroll
 *
 * ทั้งหน้าเป็นฉากเดียวต่อเนื่อง · ข้อความลอยทับเป็น DOM (คมกว่า + accessible)
 * แสง/ฟ้า/หมอก/ดาว ไล่ตาม progress เป็นวงจรกลางวัน (ดู sunAt() ใน trail.ts)
 *
 * ทุกอย่างที่วางลงฉากใช้ groundHeight(x, z) ตัวเดียวกับที่สร้าง mesh พื้น
 * — ถ้าใช้คนละสูตรเมื่อไหร่ ของจะจมพื้นทันที
 */

/* ---------- ผังฉาก: สุ่มครั้งเดียวด้วย seed คงที่ ---------- */

/** พื้นที่โล่งที่ขอให้ไม่มีของกระจายอยู่ (หน้าสมัครใช้ปลูกต้นไม้ของตัวเองตรงนี้) */
export type Clearing = { x: number; z: number; r: number };

function useLayout(clearing?: Clearing) {
  return useMemo(() => {
    const rand = mulberry32(20690829); // seed = วันงาน 29 ส.ค. 2569

    // รัศมีทุกอย่างคำนวณจาก FOOTPRINT ที่วัดจากไฟล์จริง ไม่ใช่ค่าเดา
    //
    // ต้นไม้แบ่งสองชั้น: ชั้นหน้าอัดแน่นริมทาง (ให้รู้สึกเดินอยู่ในป่าจริง ๆ)
    // ชั้นหลังบางกว่าและไกลออกไป (ให้มีความลึก ไม่ใช่แนวรั้วต้นไม้แบน ๆ)
    // ระยะห่างระหว่างต้น ใช้แค่ 0.62 ของทรงพุ่ม — ป่าจริงพุ่มไม้สอดกันอยู่แล้ว
    // ถ้าบังคับไม่ให้พุ่มแตะกันเลย ต้นไม้จะถูกดันออกห่างทางจนดูโล่ง
    const treeRadius = (s: number) => footRadius(FOOTPRINT.tree, HEIGHT.tree, s) * 0.62;
    // เว้นจากทางตามเงาตัดขวางจริงที่ระดับคนเดิน (ต้นเตี้ยพุ่มต่ำ ต้องเว้นมากกว่าต้นสูง)
    const treeTrunk = (s: number) => clearanceRadius(SILHOUETTE.tree, HEIGHT.tree * s);
    const treesNear = makeScatter(rand, 300, {
      minSpread: 0, // ให้ TRAIL_HALF + รัศมีลำต้น เป็นตัวกำหนด → ชิดทางได้มาก
      maxSpread: 15,
      scaleMin: 0.65,
      scaleMax: 1.45,
      edgeGap: 0.35,
      bias: 3.0, // เกาะกลุ่มริมทางแน่น ๆ
      radiusOf: treeRadius,
      trunkOf: treeTrunk,
    });
    const treesFar = makeScatter(rand, 140, {
      minSpread: 15,
      maxSpread: 44,
      scaleMin: 0.9,
      scaleMax: 1.7,
      bias: 1.0,
      radiusOf: treeRadius,
      trunkOf: treeTrunk,
      avoid: treesNear, // กันงอกทับชั้นหน้าตรงรอยต่อ
    });
    const trees = [...treesNear, ...treesFar];
    const grass = makeScatter(rand, 2400, {
      minSpread: 0,
      maxSpread: 15,
      scaleMin: 0.7,
      scaleMax: 1.9,
      edgeGap: 0.05, // หญ้าขึ้นชิดขอบทางได้เลย
      bias: 2.6,
      radiusOf: (s) => footRadius(FOOTPRINT.grass, HEIGHT.grass, s),
    });
    const rocksSmall = makeScatter(rand, 110, {
      minSpread: 0,
      maxSpread: 16,
      scaleMin: 0.5,
      scaleMax: 1.3,
      edgeGap: 0.15,
      bias: 2.0,
      radiusOf: (s) => footRadius(FOOTPRINT.rockSmall, HEIGHT.rockSmall, s),
    });
    const rocksLarge = makeScatter(rand, 45, {
      minSpread: 0,
      maxSpread: 20,
      scaleMin: 0.6,
      scaleMax: 1.4,
      edgeGap: 0.4,
      bias: 1.7,
      radiusOf: (s) => footRadius(FOOTPRINT.rockLarge, HEIGHT.rockLarge, s),
    });

    /**
     * ภูเขาฉากหลัง — ระยะห่างคำนวณจาก "รัศมีฐานจริง" ของแต่ละโมเดล
     * ก่อนหน้านี้วางไว้ 100–205 หน่วยตายตัว แต่ mountain-snow มีรัศมี = 1.25 × ความสูง
     * ลูกสูง 165 เลยกินรัศมี 206 หน่วย = คลุมทางเดินทั้งเส้น (เดินลอดใต้ภูเขา)
     */
    const KINDS = [
      { url: "/models/mountain-snow.glb", ratio: FOOTPRINT.mountainSnow },
      { url: "/models/mountain-ridge.glb", ratio: FOOTPRINT.mountainRidge },
      { url: "/models/snowy-hills.glb", ratio: FOOTPRINT.snowyHills },
    ];
    const mountains: { url: string; x: number; z: number; y: number; h: number; rot: number }[] = [];
    for (let i = 0; i < 20; i++) {
      const z = CAM_START_Z - 30 - (i / 20) * (TRAIL_LENGTH + 90) - rand() * 24;
      const side = i % 2 === 0 ? -1 : 1;
      const kind = KINDS[Math.floor(rand() * KINDS.length)];
      const h = 34 + rand() * 46;
      const radius = kind.ratio * h;
      // ต้องไกลกว่ารัศมีฐาน + ครึ่งความกว้างทาง + เผื่ออีกหน่อย
      const dist = radius + TRAIL_HALF + 22 + rand() * 40;
      const x = curve(z) + side * dist;
      // ฐานภูเขาแบน แต่พื้นใต้ฐาน (กว้างเป็นร้อยหน่วย) ลาดขึ้นตามระยะห่างจากทาง
      // ต้องกดลงไปถึงจุดต่ำสุดใต้ฐานทั้งวง ไม่งั้นด้านที่หันเข้าทางจะลอยเหนือพื้น
      mountains.push({
        url: kind.url,
        x,
        z,
        y: lowestGroundIn(x, z, radius) - h * 0.03,
        h,
        rot: rand() * Math.PI * 2,
      });
    }
    // ยอดใหญ่ปิดปลายทาง — ต้องอยู่ "พ้น" ปลายเส้นทางไปทั้งลูก ไม่ใช่คร่อมทางอยู่
    {
      const h = 120;
      const radius = FOOTPRINT.mountainSnow * h; // = 150
      const trailEndZ = zAt(1);
      const z = trailEndZ - radius - 70; // ขอบใกล้สุดยังห่างจากปลายทาง 70 หน่วย
      const x = curve(trailEndZ) - 8;
      mountains.push({ url: "/models/mountain-snow.glb", x, z, y: lowestGroundIn(x, z, radius) - 4, h, rot: 0.6 });
    }

    // ถางที่ให้โล่ง — ของที่กระจายไว้อาจงอกทับจุดที่หน้าสมัครจะปลูกต้นไม้ของตัวเอง
    // (ผังสุ่มด้วย seed คงที่ ก็จริง แต่ตำแหน่งที่โล่งพอดีนั้นไม่ได้การันตี)
    if (clearing) {
      const clear = <T extends { x: number; z: number; r: number }>(list: T[]) =>
        list.filter((o) => Math.hypot(o.x - clearing.x, o.z - clearing.z) > clearing.r + o.r);
      return {
        trees: clear(trees),
        grass: clear(grass),
        rocksSmall: clear(rocksSmall),
        rocksLarge: clear(rocksLarge),
        mountains,
      };
    }

    return { trees, grass, rocksSmall, rocksLarge, mountains };
  }, [clearing]);
}

/* ---------- พื้นผิว (สร้างด้วย canvas ตอน runtime ไม่ต้องโหลดไฟล์รูป) ---------- */

/**
 * texture แบบ procedural — วาดลง canvas แล้วทำเป็น CanvasTexture
 * ไม่ต้องดาวน์โหลดไฟล์รูปเพิ่ม (สำคัญ: งานนี้คนเข้าพร้อมกันหลักพันบนมือถือ)
 * seed คงที่ → ลายเดิมทุกครั้ง
 */
function makeNoiseTexture(opts: {
  size?: number;
  base: [number, number, number];
  /** จุดด่างสี + ขนาด + ความถี่ */
  specks: { color: [number, number, number]; min: number; max: number; count: number }[];
  /** ความแรงของ noise เม็ดละเอียด */
  grain: number;
  seed: number;
}) {
  const size = opts.size ?? 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const rand = mulberry32(opts.seed);

  ctx.fillStyle = `rgb(${opts.base.join(",")})`;
  ctx.fillRect(0, 0, size, size);

  // ปื้นสีขนาดใหญ่ให้ดูไม่เรียบเป็นแผ่นเดียว
  for (const layer of opts.specks) {
    for (let i = 0; i < layer.count; i++) {
      const r = layer.min + rand() * (layer.max - layer.min);
      const x = rand() * size;
      const y = rand() * size;
      ctx.globalAlpha = 0.15 + rand() * 0.5;
      ctx.fillStyle = `rgb(${layer.color.join(",")})`;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.6 + rand() * 0.8), rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // เม็ด noise ละเอียด — ทำให้พื้นผิวไม่แบนตอนกล้องอยู่ใกล้
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * opts.grain;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* ---------- พื้น + ทางเดิน ---------- */

function Ground() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(GROUND_WIDTH, TRAIL_LENGTH + 320, 130, 240);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const zOff = -TRAIL_LENGTH / 2 + CAM_START_Z;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i) + zOff; // mesh ถูกเลื่อนทีหลัง ต้องคิดพิกัดโลกตอนนี้
      pos.setY(i, groundHeight(x, z));
      // UV ตามพิกัดโลก → ลายไม่ยืดตามรูปทรง mesh
      uv.setXY(i, x / 9, z / 9);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  const map = useMemo(
    () =>
      makeNoiseTexture({
        base: [58, 96, 66],
        specks: [
          { color: [40, 74, 50], min: 14, max: 44, count: 90 },
          { color: [86, 122, 74], min: 8, max: 26, count: 120 },
          { color: [122, 140, 82], min: 2, max: 7, count: 260 },
        ],
        grain: 26,
        seed: 313,
      }),
    [],
  );
  useEffect(() => () => map.dispose(), [map]);

  return (
    <mesh geometry={geo} position={[0, 0, -TRAIL_LENGTH / 2 + CAM_START_Z]} receiveShadow>
      <meshStandardMaterial map={map} color="#9fbf9c" roughness={1} />
    </mesh>
  );
}

/**
 * ทางเดินดิน — ribbon โค้งตาม curve()
 * ขอบทั้งสองข้างเกาะพื้นจริง · กลางทางยุบลงนิดเป็นร่องที่คนเดินจนเป็นแอ่ง
 */
function TrailPath() {
  const geo = useMemo(() => {
    const steps = 620;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    // 5 จุดตัดขวาง: ขอบซ้าย, กลางซ้าย, แกนกลาง, กลางขวา, ขอบขวา
    const LANES = [-1, -0.55, 0, 0.55, 1];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const z = CAM_START_Z - t * (TRAIL_LENGTH + 40);
      const cx = curve(z);
      // ความกว้างแกว่งหลายความถี่ → ทางดูเป็นธรรมชาติ ไม่ใช่แถบกว้างเท่ากันตลอด
      const half =
        TRAIL_HALF * (0.80 + Math.sin(z * 0.07) * 0.1 + Math.sin(z * 0.021 + 1.7) * 0.07);
      for (const lane of LANES) {
        const x = cx + lane * half;
        // ร่องกลางทางลึกกว่าขอบเล็กน้อย (คนเดินซ้ำ ๆ จนเป็นแอ่ง)
        const rut = (1 - lane * lane) * 0.06;
        positions.push(x, groundHeight(x, z) + 0.05 - rut, z);
        uvs.push((lane + 1) / 2, t * (TRAIL_LENGTH / 7));
      }
    }
    const L = LANES.length;
    for (let i = 0; i < steps; i++) {
      for (let j = 0; j < L - 1; j++) {
        const a = i * L + j;
        indices.push(a, a + 1, a + L, a + 1, a + L + 1, a + L);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, []);

  const map = useMemo(
    () =>
      makeNoiseTexture({
        base: [150, 121, 86],
        specks: [
          { color: [122, 96, 66], min: 10, max: 34, count: 80 }, // ดินเข้ม
          { color: [176, 150, 112], min: 6, max: 20, count: 110 }, // ดินจาง
          { color: [96, 86, 74], min: 1.5, max: 4.5, count: 420 }, // กรวดเล็ก
          { color: [206, 190, 160], min: 1, max: 3, count: 260 }, // เม็ดทรายสว่าง
        ],
        grain: 30,
        seed: 771,
      }),
    [],
  );
  useEffect(() => {
    map.repeat.set(1, 1);
    return () => map.dispose();
  }, [map]);

  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial map={map} color="#c8ad8a" roughness={0.95} />
    </mesh>
  );
}

/* ---------- บ่อน้ำต้นน้ำ ---------- */

/**
 * ผิวน้ำของบ่อ — แอ่งถูกยุบไว้แล้วใน groundHeight() (pondBasin)
 * ตรงนี้แค่วางแผ่นน้ำโปร่งแสงทับ + ขยับ UV เบา ๆ ให้ไม่นิ่งสนิท
 */
function Ponds() {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    // กระเพื่อมช้า ๆ ด้วยการขยับระดับน้ำนิดเดียว (ถูกกว่าทำ shader คลื่น)
    const t = state.clock.elapsedTime;
    g.children.forEach((c, i) => {
      c.position.y = (c.userData.baseY as number) + Math.sin(t * 0.6 + i) * 0.012;
    });
  });

  return (
    <group ref={group}>
      {PONDS.map((p, i) => (
        <mesh
          key={i}
          position={[p.x, pondWaterLevel(p), p.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          userData={{ baseY: pondWaterLevel(p) }}
          receiveShadow
        >
          <circleGeometry args={[p.r * 0.96, 40]} />
          <meshStandardMaterial
            color="#4e7f86"
            roughness={0.12}
            metalness={0.35}
            transparent
            opacity={0.86}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- ดาว ---------- */

function Stars({ progress, count = 700 }: { progress: React.RefObject<number>; count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const mat = useRef<THREE.PointsMaterial>(null);

  const positions = useMemo(() => {
    const rand = mulberry32(9001);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // กระจายบนโดมครึ่งบน
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(rand() * 0.95);
      const r = 380;
      arr[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      arr[i * 3 + 1] = Math.cos(phi) * r;
      arr[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    const pts = ref.current;
    if (!pts) return;
    pts.position.copy(state.camera.position); // โดมดาวติดตามกล้องไปตลอด
    if (mat.current) mat.current.opacity = sunAt(progress.current).stars;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={mat}
        size={1.5}
        color="#eaf0ff"
        transparent
        opacity={0}
        sizeAttenuation={false}
        depthWrite={false}
        fog={false}
      />
    </points>
  );
}

/* ---------- ละอองในอากาศ ---------- */

function Dust({ count = 420 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, speeds } = useMemo(() => {
    const rand = mulberry32(4332);
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand() - 0.5) * 60;
      positions[i * 3 + 1] = rand() * 12;
      positions[i * 3 + 2] = (rand() - 0.5) * 90;
      speeds[i] = 0.1 + rand() * 0.28;
    }
    return { positions, speeds };
  }, [count]);

  useFrame((state, dt) => {
    const pts = ref.current;
    if (!pts) return;
    pts.position.z = state.camera.position.z;
    const arr = pts.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += speeds[i] * dt;
      arr[i * 3] += Math.sin(arr[i * 3 + 1] * 0.6 + i) * dt * 0.08;
      if (arr[i * 3 + 1] > 12) arr[i * 3 + 1] = 0;
    }
    pts.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#f3e2bb"
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ---------- แสง + ฟ้า ที่ไล่ตามเวลา ---------- */

function DayCycle({ progress }: { progress: React.RefObject<number> }) {
  const sky = useRef<React.ComponentRef<typeof Sky>>(null);
  const dir = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);

  const c1 = useMemo(() => new THREE.Color(), []);
  const c2 = useMemo(() => new THREE.Color(), []);
  const c3 = useMemo(() => new THREE.Color(), []);

  useFrame((state) => {
    const s = sunAt(progress.current);
    const [sx, sy, sz] = sunVector(s, 1);

    // ทิศดวงอาทิตย์ใน Sky shader
    const mat = sky.current?.material as THREE.ShaderMaterial | undefined;
    if (mat?.uniforms?.sunPosition) mat.uniforms.sunPosition.value.set(sx, sy, sz);

    // ไฟหลัก — เดินตามกล้องไปด้วย เงาจะได้อยู่ในกรอบ shadow camera ตลอด
    if (dir.current) {
      const cam = state.camera.position;
      dir.current.position.set(cam.x + sx * 70, Math.max(4, sy * 70), cam.z + sz * 70);
      dir.current.target.position.set(cam.x, 0, cam.z - 12);
      dir.current.target.updateMatrixWorld();
      dir.current.color.copy(c1.setRGB(s.sun[0], s.sun[1], s.sun[2]));
      dir.current.intensity = s.sunIntensity;
    }

    if (hemi.current) {
      hemi.current.color.copy(c2.setRGB(s.hemiSky[0], s.hemiSky[1], s.hemiSky[2]));
      hemi.current.groundColor.copy(c3.setRGB(s.hemiGround[0], s.hemiGround[1], s.hemiGround[2]));
      hemi.current.intensity = s.hemiIntensity;
    }

    const fog = state.scene.fog as THREE.FogExp2 | null;
    if (fog) {
      fog.color.setRGB(s.fog[0], s.fog[1], s.fog[2]);
      fog.density = s.fogDensity;
    }
  });

  return (
    <>
      <Sky ref={sky} distance={450000} turbidity={7} rayleigh={2.2} mieCoefficient={0.006} mieDirectionalG={0.82} />
      <hemisphereLight ref={hemi} args={["#cfe0d2", "#2b4a36", 1]} />
      <directionalLight
        ref={dir}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={220}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-bias={-0.0008}
      />
      <directionalLight position={[20, 14, 30]} intensity={0.25} color="#bcd4e0" />
    </>
  );
}

/* ---------- กล้อง ---------- */

function CameraRig({
  progress,
  pointer,
  reduced,
  parkAt,
}: {
  progress: React.RefObject<number>;
  pointer: React.RefObject<{ x: number; y: number }>;
  reduced: boolean;
  /** ยืนอยู่กับที่ตรง progress นี้ (หน้าสมัคร) แทนการเดินไปตาม progress */
  parkAt?: number;
}) {
  const target = useRef(new THREE.Vector3());
  const smoothed = useRef(parkAt ?? 0);

  useFrame((state, dt) => {
    const camera = state.camera;
    const k = Math.min(1, dt * 4);

    smoothed.current =
      parkAt === undefined
        ? lerp(smoothed.current, progress.current, Math.min(1, dt * 3.5))
        : parkAt;
    const p = smoothed.current;
    const z = zAt(p);
    const x = curve(z);

    const px = reduced ? 0 : pointer.current.x * 1.1;
    const py = reduced ? 0 : pointer.current.y * 0.4;
    const bobX = reduced ? 0 : Math.sin(state.clock.elapsedTime * 1.6) * 0.09;
    const bobY = reduced ? 0 : Math.abs(Math.sin(state.clock.elapsedTime * 3.2)) * 0.055;

    camera.position.x += (x + px + bobX - camera.position.x) * k;
    camera.position.y += (groundHeight(x, z) + EYE_HEIGHT - py + bobY - camera.position.y) * k;
    camera.position.z = z;

    const la = z - 16;
    const lx = curve(la);
    target.current.set(lx, groundHeight(lx, la) + 1.4 + py * 0.5, la);
    camera.lookAt(target.current);
  });

  return null;
}

/* ---------- ฉากรวม ---------- */

function Scene({
  progress,
  pointer,
  reduced,
  parkAt,
  clearing,
  children,
}: {
  progress: React.RefObject<number>;
  pointer: React.RefObject<{ x: number; y: number }>;
  reduced: boolean;
  parkAt?: number;
  clearing?: Clearing;
  children?: ReactNode;
}) {
  const { trees, grass, rocksSmall, rocksLarge, mountains } = useLayout(clearing);

  return (
    <>
      {/* fog ตั้งค่าเริ่มต้นไว้ · สี/ความหนาถูกอัปเดตทุกเฟรมใน DayCycle */}
      <fogExp2 attach="fog" args={["#d8dac8", 0.019]} />

      <DayCycle progress={progress} />
      <Stars progress={progress} />
      <CameraRig progress={progress} pointer={pointer} reduced={reduced} parkAt={parkAt} />

      <Ground />
      <TrailPath />
      <Ponds />

      <Suspense fallback={null}>
        {mountains.map((m, i) => (
          <Model key={i} url={m.url} height={m.h} position={[m.x, m.y, m.z]} rotation={m.rot} />
        ))}

        <InstancedModel url="/models/tree.glb" height={HEIGHT.tree} items={trees} />
        <InstancedModel url="/models/grass.glb" height={HEIGHT.grass} items={grass} />
        <InstancedModel url="/models/rock-small.glb" height={HEIGHT.rockSmall} items={rocksSmall} />
        <InstancedModel url="/models/rock-large.glb" height={HEIGHT.rockLarge} items={rocksLarge} />

        {MARKER_Z.map((z, i) => {
          const side = i % 2 === 0 ? 1 : -1;
          const x = curve(z) + side * (TRAIL_HALF + 1.6);
          return (
            <Model
              key={i}
              url="/models/signpost.glb"
              height={HEIGHT.signpost}
              position={[x, groundHeight(x, z), z]}
              rotation={side * -0.5}
            />
          );
        })}

        {children}
      </Suspense>

      <Dust />
    </>
  );
}

export default function TrailScene({
  progress,
  reduced,
  parkAt,
  clearing,
  children,
}: {
  progress: React.RefObject<number>;
  reduced: boolean;
  /** ยืนอยู่กับที่แทนการเดิน — หน้าสมัครใช้ค่านี้ ส่วนหน้า landing ไม่ส่งมา */
  parkAt?: number;
  /** ถางที่ตรงนี้ให้โล่ง ก่อนกระจายต้นไม้/หิน */
  clearing?: Clearing;
  /** ของที่วางเพิ่มเข้าไปในฉาก (เช่น ต้นไม้ที่โตตาม step ของหน้าสมัคร) */
  children?: ReactNode;
}) {
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (reduced) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced]);

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: 55, near: 0.1, far: 900, position: [0, EYE_HEIGHT, CAM_START_Z] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
      }}
    >
      <Scene
        progress={progress}
        pointer={pointer}
        reduced={reduced}
        parkAt={parkAt}
        clearing={clearing}
      >
        {children}
      </Scene>
    </Canvas>
  );
}
