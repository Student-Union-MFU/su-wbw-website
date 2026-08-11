// สถานการณ์ "วินาทีเปิดรับสมัคร" — 2000 คนเปิดหน้า register พร้อมกัน แล้วทยอยกด submit
//
// สองแรงพร้อมกัน:
//   open_pages : ramping-vus ไต่ถึง 2000 VU — GET หน้า /register + GET /api/capacity วนซ้ำ
//                (ทุกคนที่เปิดหน้าค้างไว้ยิง capacity ตอนโหลดหน้า)
//   submits    : ramping-arrival-rate — POST /auth/register payload ~60KB ไต่ถึง 40 req/s
//                ยิงเกินความจุ (เจตนา) เพื่อเห็นช่วงที่นั่งเต็ม → ต้องได้ 409 ไม่ใช่ 5xx
//
// ผ่าน = ไม่มี 5xx เลย, p95 ของหน้า/capacity ไม่บวม, การสมัครไม่โดนคิว throttle จนเกิน 15s

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";
import exec from "k6/execution";
import { WEB, API, studentId, registerPayload, JSON_HEADERS, scaled } from "./lib/data.js";

const registered = new Counter("registered_201");
const conflict409 = new Counter("conflict_409"); // เต็ม/สมัครซ้ำ — สถานะข้อมูล ไม่ใช่ระบบพัง
const throttled429 = new Counter("throttled_429");
const server5xx = new Counter("server_5xx");
const netFail = new Counter("net_fail"); // status 0 = ต่อไม่ติด (แยกจาก 5xx ของ server)
const registerMs = new Trend("register_ms", true);

export const options = {
  discardResponseBodies: false,
  thresholds: {
    server_5xx: ["count==0"],
    "http_req_duration{kind:page}": ["p(95)<1500"],
    "http_req_duration{kind:capacity}": ["p(95)<800"],
    register_ms: ["p(95)<15000"], // รวมเวลาต่อคิว throttle ฝั่ง server แล้ว
  },
  scenarios: {
    open_pages: {
      executor: "ramping-vus",
      exec: "openPage",
      startVUs: 0,
      stages: [
        { duration: "45s", target: scaled(800) },
        { duration: "45s", target: scaled(2000) },
        { duration: "90s", target: scaled(2000) },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
    submits: {
      executor: "ramping-arrival-rate",
      exec: "submit",
      startRate: 0,
      timeUnit: "1s",
      preAllocatedVUs: scaled(200),
      maxVUs: scaled(1200), // เผื่อ latency ยาวถึง 25s (timeout ของ throttle backlog)
      stages: [
        { duration: "60s", target: scaled(40) },
        { duration: "120s", target: scaled(40) },
        { duration: "30s", target: 0 },
      ],
    },
  },
};

export function openPage() {
  const page = http.get(`${WEB}/register`, { tags: { kind: "page" } });
  const cap = http.get(`${API}/capacity`, { tags: { kind: "capacity" } });
  check(page, { "หน้า register 200": (r) => r.status === 200 });
  check(cap, { "capacity 200": (r) => r.status === 200 });
  sleep(1 + Math.random() * 3);
}

export function submit() {
  const sid = studentId(exec.scenario.iterationInTest);
  const res = http.post(`${API}/auth/register`, registerPayload(sid), {
    headers: JSON_HEADERS,
    tags: { kind: "register" },
    timeout: "40s",
    responseCallback: http.expectedStatuses(201, 409, 429),
  });
  registerMs.add(res.timings.duration);
  if (res.status === 201) registered.add(1);
  else if (res.status === 409) conflict409.add(1);
  else if (res.status === 429) throttled429.add(1);
  else if (res.status >= 500) server5xx.add(1);
  else if (res.status === 0) netFail.add(1);
}
