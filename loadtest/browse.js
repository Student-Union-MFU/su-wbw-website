// 2000 คนใช้เว็บทั่วไปพร้อมกัน — เว็บเป็น static ทั้งหมด โหลดจริงคือ:
//   1. Node ตัวเดียวเสิร์ฟ HTML + JS chunks (three.js ก้อนใหญ่ ~600KB)
//   2. Node ตัวเดียวกันเป็น proxy ให้ทุก API call
//   3. login บางส่วน (bcrypt ฝั่ง backend)
//
// setup() ดึงชื่อไฟล์ chunk จริงจาก HTML เพื่อยิงของที่ browser โหลดจริง ไม่ใช่เดา

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";
import { WEB, API, JSON_HEADERS, scaled } from "./lib/data.js";

const server5xx = new Counter("server_5xx");
const netFail = new Counter("net_fail");

export const options = {
  thresholds: {
    server_5xx: ["count==0"],
    "http_req_duration{kind:page}": ["p(95)<1500"],
    "http_req_duration{kind:chunk}": ["p(95)<1500"],
    "http_req_duration{kind:api}": ["p(95)<800"],
    http_req_failed: ["rate<0.01"],
  },
  scenarios: {
    browse: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "60s", target: scaled(2000) },
        { duration: "120s", target: scaled(2000) },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
};

const PAGES = ["/landing", "/announcements", "/about", "/auth/participant/login"];

export function setup() {
  const html = http.get(`${WEB}/register`).body || "";
  const chunks = [...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)]
    .map((m) => m[1])
    .slice(0, 4);
  return { chunks };
}

export default function (data) {
  const page = PAGES[Math.floor(Math.random() * PAGES.length)];
  const reqs = [
    ["GET", `${WEB}${page}`, null, { tags: { kind: "page" } }],
    ...data.chunks
      .slice(0, 2)
      .map((c) => ["GET", `${WEB}${c}`, null, { tags: { kind: "chunk" } }]),
    ["GET", `${API}/capacity`, null, { tags: { kind: "api" } }],
    ["GET", `${API}/notifications/public`, null, { tags: { kind: "api" } }],
  ];
  const res = http.batch(reqs);
  for (const r of res) {
    if (r.status >= 500) server5xx.add(1);
    else if (r.status === 0) netFail.add(1);
  }
  check(res[0], { "หน้าเว็บ 200": (r) => r.status === 200 });

  // ~5% ลอง login (รหัสผิด) — เส้นทาง bcrypt โดน throttle ฝั่ง server อยู่แล้ว
  if (Math.random() < 0.05) {
    const login = http.post(
      `${API}/auth/login`,
      JSON.stringify({ username: "6939999999", password: "wrong-password-xyz" }),
      {
        headers: JSON_HEADERS,
        tags: { kind: "login" },
        timeout: "30s",
        responseCallback: http.expectedStatuses(401, 429),
      },
    );
    if (login.status >= 500) server5xx.add(1);
    else if (login.status === 0) netFail.add(1);
  }
  sleep(2 + Math.random() * 4);
}
