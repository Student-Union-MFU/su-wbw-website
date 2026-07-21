// วัดขนาดจริงของไฟล์ .glb ใน public/models
//
//   node scripts/glb-info.mjs            → กล่องครอบ + จุดหมุน + รัศมีฐาน/ความสูง
//   node scripts/glb-info.mjs --profile  → เงาตัดขวางตามความสูง (รัศมีที่แต่ละระดับ)
//
// ใช้ตอนเพิ่ม/เปลี่ยนโมเดล แล้วเอาค่าไปใส่ FOOTPRINT / SILHOUETTE ใน
// components/landing/trail.ts
//
// ทำไมต้องวัด ไม่ใช่เดา — เคยพลาดมาแล้วสามรอบ:
//   · เดารัศมีต้นไม้ 2.1 · ของจริง 0.32 × ความสูง = 4.05 → ต้นไม้ไปยืนบนทาง
//   · เดารัศมีลำต้น 0.06 · ของจริง 0.095 → ต้นไม้ล้ำเข้ามาในทางอีกรอบ
//   · ไม่ได้ดูว่า mountain-snow กว้างกว่าสูง (1.25×) → ภูเขาคลุมทางเดินทั้งเส้น
//
// อ่านจาก JSON/BIN chunk ตรง ๆ ไม่ต้องพึ่ง three.js

import fs from "fs";
import path from "path";

function parseGLB(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error("not a glb");
  let off = 12;
  let json = null;
  let bin = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    const data = buf.slice(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString("utf8"));
    if (type === 0x004e4942) bin = data;
    off += 8 + len;
    if (len % 4) off += 4 - (len % 4);
  }
  return { json, bin };
}

/* ---- เมทริกซ์ column-major เหมือน glTF ---- */
const mul = (a, b) => {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
};
const ident = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function trs(n) {
  if (n.matrix) return n.matrix.slice();
  const t = n.translation || [0, 0, 0];
  const [x, y, z, w] = n.rotation || [0, 0, 0, 1];
  const s = n.scale || [1, 1, 1];
  return [
    (1 - 2 * (y * y + z * z)) * s[0], 2 * (x * y + z * w) * s[0], 2 * (x * z - y * w) * s[0], 0,
    2 * (x * y - z * w) * s[1], (1 - 2 * (x * x + z * z)) * s[1], 2 * (y * z + x * w) * s[1], 0,
    2 * (x * z + y * w) * s[2], 2 * (y * z - x * w) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ];
}
const xf = (m, p) => [
  m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
  m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
  m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
];

/** เดินลำดับชั้น node แล้วเรียก cb(primitive, worldMatrix) ให้ทุก mesh */
function eachPrimitive(g, cb) {
  const walk = (ni, parent) => {
    const n = g.nodes[ni];
    const m = mul(parent, trs(n));
    if (n.mesh !== undefined) for (const p of g.meshes[n.mesh].primitives) cb(p, m);
    for (const c of n.children || []) walk(c, m);
  };
  for (const s of g.scenes[g.scene ?? 0].nodes) walk(s, ident());
}

/** กล่องครอบ + จำนวนสามเหลี่ยม (ใช้แค่ accessor.min/max) */
function bbox(file) {
  const { json: g } = parseGLB(fs.readFileSync(file));
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  let tris = 0;
  eachPrimitive(g, (prim, m) => {
    const acc = g.accessors[prim.attributes.POSITION];
    tris += (prim.indices !== undefined ? g.accessors[prim.indices].count : acc.count) / 3;
    // ทุกมุมของกล่องต้องผ่าน transform (หมุนแล้วกล่องเปลี่ยนรูป)
    for (let i = 0; i < 8; i++) {
      const p = xf(m, [
        i & 1 ? acc.max[0] : acc.min[0],
        i & 2 ? acc.max[1] : acc.min[1],
        i & 4 ? acc.max[2] : acc.min[2],
      ]);
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], p[k]);
        hi[k] = Math.max(hi[k], p[k]);
      }
    }
  });
  return { lo, hi, tris: Math.round(tris) };
}

/** อ่าน vertex ทุกจุด (ต้องใช้ BIN chunk) */
function verts(file) {
  const { json: g, bin } = parseGLB(fs.readFileSync(file));
  const out = [];
  eachPrimitive(g, (prim, m) => {
    const acc = g.accessors[prim.attributes.POSITION];
    const bv = g.bufferViews[acc.bufferView];
    const stride = bv.byteStride || 12;
    const base = (bv.byteOffset || 0) + (acc.byteOffset || 0);
    for (let i = 0; i < acc.count; i++) {
      const o = base + i * stride;
      out.push(xf(m, [bin.readFloatLE(o), bin.readFloatLE(o + 4), bin.readFloatLE(o + 8)]));
    }
  });
  return out;
}

/**
 * เงาตัดขวางตามความสูง — รัศมีสูงสุดของ vertex ที่อยู่ต่ำกว่าระดับหนึ่ง ๆ
 * ของที่พุ่มเริ่มต่ำกว่าระดับสายตา (1.7) จะมาปะหน้าคนเดิน ต้องเว้นทั้งพุ่ม
 * ส่วนต้นสูงเว้นแค่ลำต้นพอ เพราะพุ่มลอยข้ามหัวไป (= อุโมงค์ต้นไม้)
 */
function profile(file, name) {
  const v = verts(file);
  const ys = v.map((p) => p[1]);
  const minY = Math.min(...ys);
  const H = Math.max(...ys) - minY;
  const cx = (Math.min(...v.map((p) => p[0])) + Math.max(...v.map((p) => p[0]))) / 2;
  const cz = (Math.min(...v.map((p) => p[2])) + Math.max(...v.map((p) => p[2]))) / 2;
  console.log(`\n${name}  height=${H.toFixed(1)}  verts=${v.length}`);
  for (const hi of [0.1, 0.2, 0.3, 0.4, 0.5, 1]) {
    let r = 0;
    for (const p of v)
      if ((p[1] - minY) / H <= hi) r = Math.max(r, Math.hypot(p[0] - cx, p[2] - cz));
    console.log(
      `  up to ${(hi * 100).toFixed(0).padStart(3)}% of height   maxRadius/height = ${(r / H).toFixed(3)}`,
    );
  }
}

// รับ path โฟลเดอร์เป็น argument ได้ (เช่น public/models/growth) · ไม่ใส่ = public/models
const dirArg = process.argv.slice(2).find((a) => !a.startsWith("--"));
const dir = dirArg
  ? path.resolve(process.cwd(), dirArg) + path.sep
  : new URL("../public/models/", import.meta.url).pathname;
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".glb")).sort();

if (process.argv.includes("--profile")) {
  for (const f of files) profile(path.join(dir, f), f);
} else {
  console.log("model                size X × Y × Z            originOffsetXZ   footprintR/height   tris");
  for (const f of files) {
    const { lo, hi, tris } = bbox(path.join(dir, f));
    const sx = hi[0] - lo[0];
    const sy = hi[1] - lo[1];
    const sz = hi[2] - lo[2];
    const cx = (hi[0] + lo[0]) / 2;
    const cz = (hi[2] + lo[2]) / 2;
    console.log(
      `${f.padEnd(20)} ${sx.toFixed(1).padStart(7)} ×${sy.toFixed(1).padStart(7)} ×${sz.toFixed(1).padStart(7)}   ` +
        `(${cx.toFixed(2)}, ${cz.toFixed(2)})`.padStart(16) +
        `   ${(Math.max(sx, sz) / 2 / sy).toFixed(2).padStart(6)}            ${String(tris).padStart(6)}`,
    );
  }
}
