// แผนที่ 3D — ไฟล์ mfu-map.glb ~10MB ต่อคน คือของหนักสุดของทั้งเว็บ
// วัดว่า Node ตัวเดียวเสิร์ฟไฟล์ static ก้อนใหญ่ให้กี่คนพร้อมกันไหว ที่ throughput เท่าไหร่
//
// ไต่ทีละขั้น 100 → 500 → 1000 VU · responseType "none" ทิ้ง body ทันที
// (ไม่งั้น k6 เก็บ 10MB × 1000 VU = RAM ระเบิด)
//
// ⚠ ตัวเลขนี้คือเพดานของ "origin" — ของจริงผ่าน Cloudflare edge cache จะเบากว่านี้มาก
//   ถ้า cache ทำงาน · ดู RESULTS.md เรื่อง cache header

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";
import { WEB, scaled } from "./lib/data.js";

const server5xx = new Counter("server_5xx");
const netFail = new Counter("net_fail");
const glbMs = new Trend("glb_ms", true);

export const options = {
  discardResponseBodies: true,
  thresholds: {
    server_5xx: ["count==0"],
    http_req_failed: ["rate<0.01"],
  },
  scenarios: {
    map: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: scaled(100) },
        { duration: "60s", target: scaled(100) },
        { duration: "30s", target: scaled(500) },
        { duration: "60s", target: scaled(500) },
        { duration: "30s", target: scaled(1000) },
        { duration: "60s", target: scaled(1000) },
        { duration: "15s", target: 0 },
      ],
      gracefulRampDown: "60s",
    },
  },
};

export default function () {
  const res = http.get(`${WEB}/models/mfu-map.glb`, {
    responseType: "none",
    tags: { kind: "glb" },
    timeout: "120s",
  });
  glbMs.add(res.timings.duration);
  if (res.status >= 500) server5xx.add(1);
  else if (res.status === 0) netFail.add(1);
  check(res, { "glb 200": (r) => r.status === 200 });
  sleep(1 + Math.random() * 2);
}
