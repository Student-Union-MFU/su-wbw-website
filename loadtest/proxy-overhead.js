// วัด overhead ของ Next.js proxy — endpoint เดียวกัน อัตราเดียวกัน สองเส้นทาง:
//   รอบ 1 (default) : ผ่าน web:3001/api/capacity  (เส้นทาง production ปัจจุบัน)
//   รอบ 2 (DIRECT=1): ตรง backend:8080/wbw/capacity
//
// ผลต่างของ p95 + CPU ของ lt-web คือราคาที่จ่ายให้ proxy ต่อ request —
// ใช้ตัดสินใจว่าคุ้มมั้ยที่จะตั้ง NEXT_PUBLIC_API_BASE ให้ browser ยิง backend ตรง

import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";
import { API } from "./lib/data.js";

const server5xx = new Counter("server_5xx");

const RATE = Number(__ENV.RATE || 300);

export const options = {
  thresholds: {
    server_5xx: ["count==0"],
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
  scenarios: {
    capacity: {
      executor: "constant-arrival-rate",
      rate: RATE,
      timeUnit: "1s",
      duration: "60s",
      preAllocatedVUs: 100,
      maxVUs: 600,
    },
  },
};

export default function () {
  const res = http.get(`${API}/capacity`);
  if (res.status >= 500 || res.status === 0) server5xx.add(1);
  check(res, { "capacity 200": (r) => r.status === 200 });
}
