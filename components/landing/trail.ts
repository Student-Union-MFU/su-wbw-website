/**
 * เส้นทางเดิน — ข้อมูลกลางที่ทั้งฉาก 3D และ overlay ใช้ร่วมกัน
 *
 * ระบบพิกัด: กล้องเดินไปทาง -Z เรื่อย ๆ · Y คือความสูงจากพื้น
 * progress 0..1 = ต้นทาง..ปลายทาง (map ตรงกับ scroll ของทั้งหน้า)
 */

/** ความยาวเส้นทางในหน่วยฉาก (เมตร) — scroll ทั้งหน้าคือระยะนี้ */
export const TRAIL_LENGTH = 420;

/** จุดเริ่มของกล้อง (หน้า z=0 นิดหน่อย จะได้เห็นทางทอดไปข้างหน้า) */
export const CAM_START_Z = 8;

/** ครึ่งความกว้างทางเดิน — ไม่ปลูกอะไรในโซนนี้ */
export const TRAIL_HALF = 3.2;

/** ความสูงสายตาคนเดิน */
export const EYE_HEIGHT = 1.7;

/** ความกว้างของพื้น (ต้องกว้างกว่าภูเขาที่วางไกลสุด ไม่งั้นภูเขาจะลอยพ้นขอบพื้น) */
export const GROUND_WIDTH = 620;

/**
 * อัตราส่วน "รัศมีฐาน ÷ ความสูง" ของแต่ละโมเดล — **วัดจากไฟล์ GLB จริง**
 * (สคริปต์วัด: scripts/glb-info.mjs · อ่าน accessor.min/max ของ POSITION)
 *
 * เคยเดาค่าพวกนี้เอาเองแล้วพัง: เดาต้นไม้ไว้ 2.1 แต่ของจริง 0.32×สูง = 4.05 ตอน scale 1.7
 * ต้นไม้เลยล้ำเข้ามาบนทาง · ห้ามเดา ให้วัดแล้วใส่ตารางนี้
 */
export const FOOTPRINT = {
  tree: 0.32,
  grass: 0.82,
  rockSmall: 0.41,
  rockLarge: 1.17,
  mountainSnow: 1.25,
  mountainRidge: 0.65,
  snowyHills: 0.98,
  signpost: 0.23,
} as const;

/** ความสูงที่ใช้ render แต่ละโมเดล (หน่วยฉาก) */
export const HEIGHT = {
  tree: 7.5,
  grass: 0.42,
  rockSmall: 0.7,
  rockLarge: 1.6,
  signpost: 2.2,
} as const;

/** รัศมีฐานจริงหลัง normalize + คูณ scale ของ instance */
export function footRadius(ratio: number, height: number, scale = 1) {
  return ratio * height * scale;
}

/* ---------- บ่อน้ำ (ต้นน้ำ) แทนที่ลานกางเต็นท์เดิม ---------- */

export type Pond = { x: number; z: number; r: number };

/** ระดับน้ำอยู่ต่ำกว่าขอบบ่อเท่านี้ */
export const POND_DEPTH = 1.15;

/**
 * บ่อน้ำริมทางช่วง "ป่าต้นน้ำ" — ยุบพื้นลงเป็นแอ่งแล้ววางผิวน้ำทับ
 * วางห่างจากทางพอให้ไม่กินทางเดิน (เช็คใน pondsClearOfTrail())
 */
export const PONDS: Pond[] = [
  { x: 0, z: -150, r: 7.5 },
  { x: 0, z: -178, r: 5.2 },
  { x: 0, z: -205, r: 9.0 },
  { x: 0, z: -246, r: 6.4 },
].map((p, i) => {
  const side = i % 2 === 0 ? 1 : -1;
  // curve/terrainHeight เป็น function declaration → hoist แล้ว เรียกตอน init ได้
  return { ...p, x: curve(p.z) + side * (TRAIL_HALF + p.r + 2.2) };
});

/** อยู่ในแอ่งบ่อไหม (บวก margin) */
export function inPond(x: number, z: number, margin = 0) {
  for (const p of PONDS) {
    const dx = x - p.x;
    const dz = z - p.z;
    if (dx * dx + dz * dz < (p.r + margin) * (p.r + margin)) return true;
  }
  return false;
}

/** ความลึกที่ต้องยุบพื้นลงที่พิกัดนี้ (0 = ไม่ใช่บ่อ) */
function pondBasin(x: number, z: number) {
  let d = 0;
  for (const p of PONDS) {
    const dist = Math.hypot(x - p.x, z - p.z);
    if (dist >= p.r) continue;
    const t = 1 - dist / p.r;
    d = Math.max(d, POND_DEPTH * (t * t * (3 - 2 * t))); // smoothstep ขอบบ่อไม่หักมุม
  }
  return d;
}

/** ระดับผิวน้ำของบ่อ */
export function pondWaterLevel(p: Pond) {
  return terrainHeight(p.z) - POND_DEPTH * 0.45;
}

/** เส้นทางคดเคี้ยว — ผสมสองคลื่นให้ไม่ซ้ำรอบสั้น ๆ */
export function curve(z: number) {
  return Math.sin(z * 0.045 + 0.6) * 2.4 + Math.sin(z * 0.013 - 1.2) * 4.6;
}

/** ความสูงภูมิประเทศตามแนวเส้นทาง (ไม่คิดระยะห่างจากทาง) */
export function terrainHeight(z: number) {
  return Math.sin(z * 0.021 + 2.1) * 1.5 + Math.sin(z * 0.008 - 0.4) * 2.8;
}

/**
 * ผิวขรุขระแบบ deterministic — ห้ามใช้ Math.random()
 * ตอนแรกพื้นสุ่มด้วย rand() ต่อ vertex แต่ต้นไม้วางด้วย terrainHeight() เฉย ๆ
 * ค่ามันไม่มีทางตรงกัน ต้นไม้เลยจมพื้น · ตอนนี้ทั้งพื้นและของที่วางเรียกฟังก์ชันเดียวกัน
 */
function roughness(x: number, z: number) {
  return Math.sin(x * 0.7) * Math.sin(z * 0.63) * 0.34 + Math.sin(x * 1.9 + z * 0.41) * 0.16;
}

/**
 * ความสูงพื้นจริงที่พิกัด (x, z) — **แหล่งความจริงเดียว**
 * ใช้ทั้งตอนสร้าง mesh พื้น และตอนวางต้นไม้/หิน/เต็นท์/ภูเขา
 * ถ้าแก้สูตรนี้ ทุกอย่างขยับตามกันหมด ไม่มีทางหลุดจากกันอีก
 */
export function groundHeight(x: number, z: number) {
  const d = Math.abs(x - curve(z));
  // ตรงทางเดินราบเรียบ · ออกห่างไปค่อยขรุขระและยกตัวสูงขึ้นเป็นเนิน
  const flat = d < TRAIL_HALF + 2 ? 0 : Math.min(1, (d - TRAIL_HALF - 2) / 6);
  return (
    terrainHeight(z) + roughness(x, z) * flat + Math.max(0, d - 28) * 0.16 - pondBasin(x, z)
  );
}

/** PRNG มี seed — ฉากหน้าตาเดิมทุกครั้ง */
export function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp01(x: number) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** แปลง progress (0..1) เป็นพิกัด z ของกล้อง */
export function zAt(progress: number) {
  return CAM_START_Z - progress * TRAIL_LENGTH;
}

/* ============================================================
   วงจรกลางวัน — เดินจากก่อนฟ้าสางไปจนตะวันลับดอย
   ค่าทุกอย่าง (มุมดวงอาทิตย์ สี ความสว่าง หมอก ดาว) ไล่ตาม progress
   ============================================================ */

export type SunState = {
  elev: number; // องศาเหนือขอบฟ้า (ติดลบ = ยังไม่ขึ้น)
  azim: number; // องศา
  sun: [number, number, number];
  sunIntensity: number;
  hemiSky: [number, number, number];
  hemiGround: [number, number, number];
  hemiIntensity: number;
  fog: [number, number, number];
  fogDensity: number;
  stars: number; // 0..1 ความชัดของดาว
};

const SUN_KEYS: (SunState & { p: number })[] = [
  {
    p: 0.0, // ก่อนฟ้าสาง
    elev: -8,
    azim: 104,
    sun: [0.35, 0.45, 0.72],
    sunIntensity: 0.18,
    hemiSky: [0.13, 0.18, 0.3],
    hemiGround: [0.05, 0.09, 0.07],
    hemiIntensity: 0.4,
    fog: [0.07, 0.11, 0.15],
    fogDensity: 0.009,
    stars: 1,
  },
  {
    p: 0.18, // ตะวันขึ้น
    elev: 3,
    azim: 100,
    sun: [1.0, 0.55, 0.26],
    sunIntensity: 2.2,
    hemiSky: [0.56, 0.5, 0.5],
    hemiGround: [0.15, 0.2, 0.15],
    hemiIntensity: 0.85,
    fog: [0.76, 0.6, 0.45],
    fogDensity: 0.0072,
    stars: 0.22,
  },
  {
    p: 0.36, // สาย
    elev: 24,
    azim: 94,
    sun: [1.0, 0.86, 0.66],
    sunIntensity: 2.6,
    hemiSky: [0.7, 0.8, 0.92],
    hemiGround: [0.2, 0.3, 0.22],
    hemiIntensity: 1.15,
    fog: [0.8, 0.83, 0.79],
    fogDensity: 0.0055,
    stars: 0,
  },
  {
    p: 0.56, // เที่ยง
    elev: 58,
    azim: 78,
    sun: [1.0, 0.98, 0.93],
    sunIntensity: 2.85,
    hemiSky: [0.76, 0.86, 1.0],
    hemiGround: [0.25, 0.35, 0.25],
    hemiIntensity: 1.35,
    fog: [0.85, 0.88, 0.86],
    fogDensity: 0.0045,
    stars: 0,
  },
  {
    p: 0.79, // บ่ายคล้อย
    elev: 25,
    azim: 58,
    sun: [1.0, 0.86, 0.6],
    sunIntensity: 2.5,
    hemiSky: [0.72, 0.78, 0.86],
    hemiGround: [0.22, 0.3, 0.22],
    hemiIntensity: 1.05,
    fog: [0.86, 0.8, 0.7],
    fogDensity: 0.0055,
    stars: 0,
  },
  {
    p: 1.0, // ตะวันลับดอย
    elev: 2,
    azim: 48,
    sun: [1.0, 0.46, 0.2],
    sunIntensity: 2.0,
    hemiSky: [0.5, 0.4, 0.43],
    hemiGround: [0.14, 0.16, 0.14],
    hemiIntensity: 0.72,
    fog: [0.73, 0.5, 0.38],
    fogDensity: 0.00725,
    stars: 0.18,
  },
];

function lerp3(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** สถานะแสง/ฟ้าที่ progress p — interpolate ระหว่าง keyframe */
export function sunAt(p: number): SunState {
  const q = clamp01(p);
  let i = 0;
  while (i < SUN_KEYS.length - 2 && q > SUN_KEYS[i + 1].p) i++;
  const a = SUN_KEYS[i];
  const b = SUN_KEYS[i + 1];
  const t = clamp01((q - a.p) / (b.p - a.p || 1));
  // smoothstep ให้เปลี่ยนช่วงนุ่ม ไม่หักมุม
  const s = t * t * (3 - 2 * t);
  return {
    elev: lerp(a.elev, b.elev, s),
    azim: lerp(a.azim, b.azim, s),
    sun: lerp3(a.sun, b.sun, s),
    sunIntensity: lerp(a.sunIntensity, b.sunIntensity, s),
    hemiSky: lerp3(a.hemiSky, b.hemiSky, s),
    hemiGround: lerp3(a.hemiGround, b.hemiGround, s),
    hemiIntensity: lerp(a.hemiIntensity, b.hemiIntensity, s),
    fog: lerp3(a.fog, b.fog, s),
    fogDensity: lerp(a.fogDensity, b.fogDensity, s),
    stars: lerp(a.stars, b.stars, s),
  };
}

/** ทิศดวงอาทิตย์เป็นเวกเตอร์ (ระยะไกล ๆ สำหรับ Sky shader / directional light) */
export function sunVector(s: SunState, radius = 1): [number, number, number] {
  const e = (s.elev * Math.PI) / 180;
  const a = (s.azim * Math.PI) / 180;
  return [
    Math.cos(e) * Math.sin(a) * radius,
    Math.sin(e) * radius,
    -Math.cos(e) * Math.cos(a) * radius,
  ];
}

/* ============================================================
   ช่วงที่ข้อความแต่ละอันโผล่
   ============================================================ */

/**
 * index 0 = hero, 1..4 = เนื้อหา 4 ช่วง (ตรงกับ t.landing.sections), 5 = ปิดท้าย/สมัคร
 * เว้นช่วงว่างระหว่างกันไว้ให้ได้ "เดิน" เฉย ๆ ไม่ใช่อ่านตลอดเวลา
 */
export const BEATS: { start: number; end: number }[] = [
  { start: 0.0, end: 0.11 }, // hero
  { start: 0.16, end: 0.31 },
  { start: 0.36, end: 0.51 },
  { start: 0.56, end: 0.71 },
  { start: 0.75, end: 0.88 },
  { start: 0.92, end: 1.0 }, // ปิดท้าย + ปุ่มสมัคร
];

/**
 * ความทึบของ beat ที่ progress p
 * - beat 0 (hero) เห็นเต็มตั้งแต่ p=0 ไม่ต้องเลื่อนก่อน — entrance เป็น CSS animation ตอนโหลด
 * - beat สุดท้ายค้างไว้ ไม่เฟดออก (เป็นหน้าจบ)
 */
export function beatOpacity(p: number, i: number) {
  const b = BEATS[i];
  if (!b) return 0;
  const fade = 0.035;
  const inO = i === 0 ? 1 : clamp01((p - b.start) / fade);
  const outO = i === BEATS.length - 1 ? 1 : 1 - clamp01((p - (b.end - fade)) / fade);
  return inO * outO;
}

/** ตำแหน่ง z ของ "หมุด" แต่ละช่วง — ใช้ปักป้ายบอกระยะริมทาง */
export const MARKER_Z = BEATS.slice(0, 5).map((b) => zAt((b.start + b.end) / 2));

/* ============================================================
   กระจายของลงฉาก (ต้นไม้/หิน) — ปฏิเสธจุดที่ทับของเดิม
   ============================================================ */

export type Scattered = {
  x: number;
  z: number;
  y: number;
  scale: number;
  rot: number;
  /** รัศมีทรงพุ่ม — ใช้กันของงอกซ้อนกัน */
  r: number;
  /** รัศมีที่ระดับพื้น (ลำต้น) — ใช้เว้นระยะจากทางเดินเท่านั้น */
  rt: number;
};

/**
 * เงาตัดขวางของโมเดลตามความสูง — **วัดจาก vertex จริง** (`node scripts/glb-info.mjs --profile`)
 * แต่ละคู่คือ [เศษส่วนความสูง, รัศมีสูงสุด ÷ ความสูง สะสมตั้งแต่พื้นถึงระดับนั้น]
 *
 * ทำไมต้องมี: เคยเดาว่ารัศมีลำต้น = 0.06 × ความสูง ของจริงคือ 0.095 (มากกว่า 58%)
 * ต้นไม้เลยล้ำเข้ามาในทาง · และพุ่มเริ่มที่ 30% ของความสูง แปลว่าต้นเตี้ย ๆ
 * (สูง 4.9) มีพุ่มอยู่ที่ 1.46 = ต่ำกว่าระดับสายตา 1.7 → พุ่มมาปะหน้าคนเดิน
 */
export const SILHOUETTE = {
  tree: [
    [0.3, 0.095],
    [0.4, 0.294],
    [1.0, 0.405],
  ],
  grass: [[1.0, 0.986]],
} as const;

/** รัศมีที่ระดับความสูง f (0..1 ของความสูงตัวเอง) */
function silhouetteAt(profile: readonly (readonly [number, number])[], f: number) {
  for (const [band, r] of profile) if (f <= band) return r;
  return profile[profile.length - 1][1];
}

/**
 * รัศมีที่ต้องเว้นจากทางเดิน = รัศมีสูงสุดในช่วงความสูงที่คนเดินชนได้
 * ต้นสูงพอ → คิดแค่ลำต้น (พุ่มลอยข้ามหัวไป = อุโมงค์ต้นไม้ ซึ่งคือภาพที่อยากได้)
 * ต้นเตี้ย → พุ่มอยู่ระดับหน้า ต้องเว้นทั้งพุ่ม
 */
export function clearanceRadius(
  profile: readonly (readonly [number, number])[],
  height: number,
  headroom = 0.8,
) {
  const f = Math.min(1, (EYE_HEIGHT + headroom) / height);
  return silhouetteAt(profile, f) * height;
}

/**
 * ความสูงพื้น "ต่ำสุด" ในวงรัศมี r รอบจุด (x, z)
 * ภูเขาฐานกว้างเป็นร้อยหน่วย แต่พื้นลาดขึ้นเรื่อย ๆ ตามระยะห่างจากทาง
 * ถ้าวางฐานที่ความสูงจุดศูนย์กลาง ด้านที่หันเข้าทาง (พื้นต่ำกว่า) จะลอย
 */
export function lowestGroundIn(x: number, z: number, r: number) {
  let lo = groundHeight(x, z);
  for (let ring = 1; ring <= 3; ring++) {
    const rr = (r * ring) / 3;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      lo = Math.min(lo, groundHeight(x + Math.cos(a) * rr, z + Math.sin(a) * rr));
    }
  }
  return lo;
}

/** ปฏิเสธจุดที่ทับของเดิม — กันต้นไม้งอกซ้อนกันเป็นก้อน */
export function makeScatter(
  rand: () => number,
  count: number,
  opts: {
    minSpread: number;
    maxSpread: number;
    radiusOf: (scale: number) => number;
    scaleMin: number;
    scaleMax: number;
    tries?: number;
    /** ระยะเผื่อจากขอบทาง (ยิ่งน้อยยิ่งชิดทาง) */
    edgeGap?: number;
    /** เลขยกกำลังของการกระจาย: >1 เกาะใกล้ทาง, <1 กระจายออกไกล */
    bias?: number;
    /** ของที่วางไปแล้วจากรอบก่อน — รอบนี้จะไม่วางทับ (ใช้ตอนกระจายหลายชั้น) */
    avoid?: Scattered[];
    /** รัศมีที่ระดับพื้น (ลำต้น) — ถ้าไม่ใส่ ถือว่าตันเท่ารัศมีพุ่ม */
    trunkOf?: (scale: number) => number;
  },
) {
  const out: Scattered[] = [];
  // แบ่งช่องตามแกน z เพื่อไม่ต้องเทียบกับทุกต้น (O(n²) ที่ 500+ ต้นเริ่มอืด)
  const CELL = 12;
  const grid = new Map<number, Scattered[]>();
  const key = (z: number) => Math.floor(z / CELL);

  // ใส่ของจากรอบก่อนลงตารางด้วย ไม่งั้นชั้นหน้า/ชั้นหลังจะงอกทับกันตรงรอยต่อ
  for (const o of opts.avoid ?? []) {
    const k = key(o.z);
    const b = grid.get(k);
    if (b) b.push(o);
    else grid.set(k, [o]);
  }

  let guard = 0;
  const maxTries = (opts.tries ?? 14) * count;
  while (out.length < count && guard++ < maxTries) {
    const z = CAM_START_Z - rand() * (TRAIL_LENGTH + 60);
    const scale = lerp(opts.scaleMin, opts.scaleMax, rand());
    const r = opts.radiusOf(scale);
    // เว้นระยะจากขอบทางเท่ากับรัศมีของตัวเอง กล้องจะได้ไม่เดินทะลุ
    const rt = opts.trunkOf ? opts.trunkOf(scale) : r;
    // เว้นจากทางด้วย "ลำต้น" ไม่ใช่ทรงพุ่ม → ต้นไม้เข้ามาชิดทางได้ พุ่มคลุมเหนือหัว
    const minS = Math.max(opts.minSpread, TRAIL_HALF + rt + (opts.edgeGap ?? 0.3));
    if (minS >= opts.maxSpread) continue;
    // bias > 1 = เกาะกลุ่มใกล้ทาง (ยิ่งมากยิ่งชิด) · ก่อนหน้านี้ใช้ 0.55 ซึ่งดันออกไปไกล
    const spread = minS + Math.pow(rand(), opts.bias ?? 1.9) * (opts.maxSpread - minS);
    const side = rand() < 0.5 ? -1 : 1;
    const x = curve(z) + side * spread;

    // ไม่ปลูกลงไปในบ่อน้ำ
    if (inPond(x, z, r)) continue;

    // เทียบกับเพื่อนบ้านในช่องติดกัน
    let hit = false;
    const k = key(z);
    for (let dk = -1; dk <= 1 && !hit; dk++) {
      for (const o of grid.get(k + dk) ?? []) {
        const dx = o.x - x;
        const dz = o.z - z;
        if (dx * dx + dz * dz < (o.r + r) * (o.r + r)) {
          hit = true;
          break;
        }
      }
    }
    if (hit) continue;

    const item: Scattered = { x, z, y: groundHeight(x, z), scale, rot: rand() * Math.PI * 2, r, rt };
    out.push(item);
    const bucket = grid.get(k);
    if (bucket) bucket.push(item);
    else grid.set(k, [item]);
  }
  return out;
}
