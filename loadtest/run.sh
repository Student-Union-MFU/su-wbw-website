#!/usr/bin/env bash
# ตัวรัน load test ทั้งชุด — ยิงใส่ stack ทดสอบ (loadtest/stack) เท่านั้น ไม่แตะของจริง
#
# ใช้:
#   ./run.sh smoke               # ทุก scenario แบบย่อส่วน (เช็คว่า script ไม่พัง)
#   ./run.sh register|race|browse|map|eventday|proxy   # ทีละตัว เต็มสเกล
#   ./run.sh all                 # ครบชุดเต็มสเกล (~25 นาที)
#
# ผลอยู่ใน loadtest/results/<timestamp>/ — summary k6 (.txt/.json) + docker stats (.log)
set -euo pipefail
cd "$(dirname "$0")"

NET=su-loadtest-net
API_LOCAL=http://localhost:18080/wbw
STAMP=$(date +%Y%m%d-%H%M%S)
RESULTS="results/$STAMP"
mkdir -p "$RESULTS"

k6run() { # k6run <ชื่อ> <script> [env...]
  local name=$1 script=$2; shift 2
  local envs=(); for e in "$@"; do envs+=(-e "$e"); done
  stats_start "$name"
  # sysctl สองตัว: เครื่องยิงตัวเดียวเปิด connection แสนครั้ง — ephemeral port (default
  # ~28k) หมดเพราะ TIME_WAIT 60s · ขยาย range + reuse ให้ k6 ไม่ตายก่อน server
  # threshold ล้ม = "ผลเทส" ไม่ใช่บั๊กของ script — อย่าให้ set -e หยุดทั้งชุด
  docker run --rm --user "$(id -u):$(id -g)" --network $NET \
    --sysctl net.ipv4.ip_local_port_range="1024 65535" \
    --sysctl net.ipv4.tcp_tw_reuse=1 \
    -v "$PWD:/scripts" -w /scripts grafana/k6 run \
    "${envs[@]}" --summary-export "/scripts/$RESULTS/$name.json" "$script" \
    2>&1 | tee "$RESULTS/$name.txt" \
    || echo "!! $name: k6 exit $? (threshold ไม่ผ่าน — ดูรายละเอียดใน $RESULTS/$name.txt)"
  stats_stop
}

psql_lt() { docker exec lt-postgres psql -U admin -d sudb -tAc "$1"; }

# ล้าง DB ทดสอบ + สร้าง admin ใหม่ (สมัครผ่าน API ให้ได้ bcrypt hash แบบเดียวกับของจริง
# แล้วยกเป็น admin — role เปลี่ยนแล้ว trigger คืนที่นั่งให้เอง)
reset_db() {
  echo "-- reset DB ทดสอบ --"
  psql_lt "TRUNCATE wbw_user CASCADE" > /dev/null
  # TRUNCATE ไม่ยิง row trigger — ต้องรีเซ็ตตัวนับเอง
  psql_lt "UPDATE wbw_capacity SET taken=0, max_participants=2000, updated_at=now()" > /dev/null
  curl -s -o /dev/null -X POST "$API_LOCAL/auth/register" -H 'Content-Type: application/json' -d '{
    "student_id":"6930000001","password":"loadtest12345",
    "profile":{"first_name":"แอดมิน","last_name":"เทส","school_id":1,"sex":"unspecified",
      "phone":"0810000001","emergency_contact_name":"-","emergency_contact_phone":"0810000002"},
    "medical":{"birthdate":"2000-01-01","weight_kg":60,"height_cm":170,"blood_type":"O+"},
    "health":{"chronic_conditions":[]},
    "consent":{"consent_health_data":true,"consent_emergency_treatment":true,"waiver_accepted":true}}'
  psql_lt "UPDATE wbw_user SET role='admin' WHERE username='6930000001'" > /dev/null
}

STATS_PID=""
stats_start() {
  local name=$1
  ( while true; do
      docker stats --no-stream --format '{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}' \
        lt-web lt-backend lt-postgres 2>/dev/null | sed "s/^/$(date +%T)\t/"
      sleep 5
    done >> "$RESULTS/stats-$name.log" ) &
  STATS_PID=$!
}
stats_stop() { [ -n "$STATS_PID" ] && kill "$STATS_PID" 2>/dev/null || true; STATS_PID=""; }
trap stats_stop EXIT

do_register() { reset_db; k6run register register-rush.js; echo "DB: $(psql_lt 'SELECT taken FROM wbw_capacity') คนใน DB หลังจบ"; }

do_race() {
  reset_db
  local seats=${SEATS:-50} vus=${RACE_VUS:-500}
  psql_lt "UPDATE wbw_capacity SET max_participants = taken + $seats" > /dev/null
  k6run race capacity-race.js "RACE_VUS=$vus"
  local taken max
  taken=$(psql_lt 'SELECT taken FROM wbw_capacity'); max=$(psql_lt 'SELECT max_participants FROM wbw_capacity')
  echo "== ตรวจ oversell: taken=$taken / max=$max (ต้อง taken <= max) =="
  [ "$taken" -le "$max" ] && echo "PASS: ไม่ oversell" || echo "FAIL: ทะลุเพดาน!"
  psql_lt "UPDATE wbw_capacity SET max_participants=2000" > /dev/null
}

do_browse()   { k6run browse browse.js; }
do_map()      { k6run map map-bandwidth.js; }
do_eventday() { reset_db; k6run eventday event-day.js; }
do_proxy()    { k6run proxy-via-next proxy-overhead.js; k6run proxy-direct proxy-overhead.js DIRECT=1; }

do_smoke() {
  reset_db
  k6run smoke-register register-rush.js SCALE=0.02
  k6run smoke-race capacity-race.js RACE_VUS=20
  k6run smoke-browse browse.js SCALE=0.02
  k6run smoke-map map-bandwidth.js SCALE=0.05
  reset_db
  k6run smoke-eventday event-day.js SCALE=0.1
  k6run smoke-proxy proxy-overhead.js RATE=30
}

case "${1:-}" in
  smoke)    do_smoke ;;
  register) do_register ;;
  race)     do_race ;;
  browse)   do_browse ;;
  map)      do_map ;;
  eventday) do_eventday ;;
  proxy)    do_proxy ;;
  all)      do_register; do_race; do_browse; do_map; do_eventday; do_proxy ;;
  *) echo "ใช้: $0 {smoke|register|race|browse|map|eventday|proxy|all}"; exit 1 ;;
esac
echo "ผลทั้งหมดอยู่ที่ loadtest/$RESULTS/"
