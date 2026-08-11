// วันงานจริง — สามแรงพร้อมกัน:
//   staff_checkin      : ~50 เจ้าหน้าที่ สแกน BIB เช็คอินผู้เข้าร่วมที่ฐานวนตลอดงาน
//   admin_dashboard    : ~5 แอดมินเปิด dashboard ค้างไว้ — แต่ละรอบ burst 4 API พร้อมกัน
//   participant_browse : ~500 ผู้เข้าร่วมเปิดแอปดู /me + capacity เป็นระยะ
//
// setup() เตรียมข้อมูลเองทั้งหมด (idempotent — รันซ้ำได้):
//   สร้าง checkpoint 10 ฐาน, staff 50 คน, และผู้เข้าร่วม ≥100 คน (ถ้า DB ยังว่าง)
//
// ต้องมี admin อยู่ก่อน: username 6930000001 / loadtest12345 (run.sh สร้างให้)

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";
import { API, pad, studentId, registerPayload, JSON_HEADERS, scaled } from "./lib/data.js";

const server5xx = new Counter("server_5xx");
const netFail = new Counter("net_fail");
const checkinMs = new Trend("checkin_ms", true);
const dashboardMs = new Trend("dashboard_ms", true);

const ADMIN_USER = __ENV.ADMIN_USER || "6930000001";
const ADMIN_PASS = __ENV.ADMIN_PASS || "loadtest12345";
const N_STAFF = Number(__ENV.N_STAFF || 50);
const N_CHECKPOINTS = 10;
const MIN_PARTICIPANTS = 100;

export const options = {
  setupTimeout: "180s",
  thresholds: {
    server_5xx: ["count==0"],
    checkin_ms: ["p(95)<800"],
    dashboard_ms: ["p(95)<2000"],
  },
  scenarios: {
    staff_checkin: {
      executor: "constant-vus",
      exec: "staffCheckin",
      vus: scaled(N_STAFF),
      duration: "3m",
    },
    admin_dashboard: {
      executor: "constant-vus",
      exec: "adminDashboard",
      vus: Math.max(1, Math.round(5 * (scaled(N_STAFF) / N_STAFF))),
      duration: "3m",
    },
    participant_browse: {
      executor: "ramping-vus",
      exec: "participantBrowse",
      startVUs: 0,
      stages: [
        { duration: "45s", target: scaled(500) },
        { duration: "105s", target: scaled(500) },
        { duration: "30s", target: 0 },
      ],
    },
  },
};

function login(username, password) {
  const res = http.post(
    `${API}/auth/login`,
    JSON.stringify({ username, password }),
    { headers: JSON_HEADERS, timeout: "30s" },
  );
  return res.status === 200 ? res.json("token") : null;
}

function auth(token, extra) {
  return Object.assign(
    { headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS } },
    extra,
  );
}

export function setup() {
  const atoken = login(ADMIN_USER, ADMIN_PASS);
  if (!atoken) throw new Error("login admin ไม่ได้ — รันผ่าน run.sh เพื่อ seed admin ก่อน");

  // ฐาน (checkpoint) ให้ครบ 10
  let cps = http.get(`${API}/admin/checkpoints`, auth(atoken)).json() || [];
  for (let i = cps.length; i < N_CHECKPOINTS; i++) {
    http.post(
      `${API}/admin/checkpoints`,
      JSON.stringify({ name: `ฐานทดสอบ ${i + 1}`, sequence: i + 1 }),
      auth(atoken),
    );
  }
  cps = http.get(`${API}/admin/checkpoints`, auth(atoken)).json() || [];
  const checkpointIds = cps.map((c) => c.id ?? c.checkpoint_id).filter((x) => x != null);

  // เจ้าหน้าที่ ltstaff001..N — 409 = มีแล้วจากรอบก่อน ใช้ต่อได้เลย
  const staff = [];
  for (let i = 1; i <= N_STAFF; i++) {
    const username = `ltstaff${pad(i, 3)}`;
    http.post(
      `${API}/admin/users`,
      JSON.stringify({ username, password: "loadtest12345", role: "staff" }),
      auth(atoken, { responseCallback: http.expectedStatuses(201, 409) }),
    );
    staff.push(username);
  }

  // ผู้เข้าร่วม 100 บัญชีช่วง SID offset 5000000 — participant VU ใช้ login
  // (409 = มีอยู่แล้วจากรอบก่อน ใช้ต่อได้ · ถ้า DB เต็มพอดีจะ 409-เต็ม ซึ่ง VU รับมือเองแล้ว)
  for (let i = 0; i < MIN_PARTICIPANTS; i++) {
    http.post(
      `${API}/auth/register`,
      registerPayload(studentId(i, 5000000)),
      {
        headers: JSON_HEADERS,
        timeout: "40s",
        responseCallback: http.expectedStatuses(201, 409),
      },
    );
  }
  const cap = http.get(`${API}/capacity`).json();

  return { atoken, staff, checkpointIds, maxBib: cap.taken };
}

// token ต่อ VU — login ครั้งแรกครั้งเดียวแล้วใช้ซ้ำ (เหมือนแอปจริง)
let vuToken = null;

export function staffCheckin(data) {
  if (!vuToken) {
    const username = data.staff[(__VU - 1) % data.staff.length];
    vuToken = login(username, "loadtest12345");
    if (!vuToken) return sleep(2);
  }
  const cp = data.checkpointIds[Math.floor(Math.random() * data.checkpointIds.length)];
  const bib = 1 + Math.floor(Math.random() * data.maxBib);
  const res = http.post(
    `${API}/staff/checkin`,
    JSON.stringify({ checkpoint_id: cp, bib }),
    auth(vuToken, {
      tags: { kind: "checkin" },
      // 404 = สุ่ม BIB ไม่เจอ (ยอมรับได้) — สนใจแค่ห้าม 5xx
      responseCallback: http.expectedStatuses(200, 404),
    }),
  );
  checkinMs.add(res.timings.duration);
  if (res.status >= 500) server5xx.add(1);
  else if (res.status === 0) netFail.add(1);
  sleep(2 + Math.random() * 3);
}

export function adminDashboard(data) {
  const a = auth(data.atoken, { tags: { kind: "admin" } });
  const res = http.batch([
    ["GET", `${API}/admin/dashboard`, null, a],
    ["GET", `${API}/admin/participants`, null, a],
    ["GET", `${API}/admin/checkpoints`, null, a],
    ["GET", `${API}/admin/bases-overview`, null, a],
  ]);
  for (const r of res) {
    dashboardMs.add(r.timings.duration);
    if (r.status >= 500) server5xx.add(1);
    else if (r.status === 0) netFail.add(1);
  }
  check(res[0], { "dashboard 200": (r) => r.status === 200 });
  sleep(15 + Math.random() * 15);
}

export function participantBrowse(data) {
  if (!vuToken) {
    // แชร์ 100 บัญชีที่ setup สมัครไว้ (หรือของ register-rush ที่รหัสเดียวกัน)
    const sid = studentId((__VU - 1) % Math.min(data.maxBib, MIN_PARTICIPANTS), 5000000);
    vuToken = login(sid, "loadtest12345");
    if (!vuToken) return sleep(3);
  }
  const me = http.get(`${API}/me`, auth(vuToken, { tags: { kind: "me" } }));
  http.get(`${API}/capacity`, { tags: { kind: "api" } });
  if (me.status >= 500) server5xx.add(1);
  else if (me.status === 0) netFail.add(1);
  sleep(5 + Math.random() * 5);
}
