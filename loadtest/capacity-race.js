// เทส race ที่นั่งใกล้เต็ม — ก่อนรัน run.sh จะตั้ง max_participants = taken + SEATS (เช่น 50)
// แล้วปล่อย RACE_VUS (เช่น 500) คน POST สมัครพร้อมกันหมดในจังหวะเดียว
//
// สิ่งที่พิสูจน์:
//   1. จำนวนที่สมัครสำเร็จ (201) ต้อง ≤ SEATS เป๊ะ — CHECK constraint ใน DB กัน oversell
//   2. คนที่เกินต้องได้ 409 "ที่นั่งเต็ม" — ไม่ใช่ 500
//   3. ไม่มี 5xx แม้แต่ครั้งเดียวขณะ 500 transaction ชิงแถวล็อกเดียวกัน
//
// run.sh ตรวจ DB ซ้ำหลังจบ (taken ต้อง = max) — k6 ฝั่งนี้รายงานฝั่ง HTTP

import http from "k6/http";
import { Counter, Trend } from "k6/metrics";
import exec from "k6/execution";
import { API, studentId, registerPayload, JSON_HEADERS } from "./lib/data.js";

const registered = new Counter("registered_201");
const conflict409 = new Counter("conflict_409");
const throttled429 = new Counter("throttled_429");
const server5xx = new Counter("server_5xx");
const netFail = new Counter("net_fail");
const registerMs = new Trend("register_ms", true);

const VUS = Number(__ENV.RACE_VUS || 500);

export const options = {
  thresholds: {
    server_5xx: ["count==0"],
  },
  scenarios: {
    race: {
      executor: "per-vu-iterations",
      vus: VUS,
      iterations: 1,
      maxDuration: "90s",
    },
  },
};

export default function () {
  // ทุก VU ยิงทันทีที่สตาร์ท — จงใจให้ชนกันแรงที่สุด
  const sid = studentId(exec.vu.idInTest, __ENV.SID_OFFSET || 4000000);
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
