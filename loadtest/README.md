# Load Test — รับ 2000 คนพร้อมกันไหวมั้ย

ชุดทดสอบโหลดของระบบ WBW ทั้ง stack (Next.js web → proxy → Go backend → Postgres)
ยิงใส่ **stack ทดสอบแยก** ที่จำลองจาก image เดียวกับ production — ไม่แตะของจริง

## ⚠ ห้ามยิงใส่ stack จริง

เครื่อง production รัน `su-web`/`su-server`/`postgres-db` (+cloudflared) อยู่
การยิง register ใส่ตัวจริงจะสร้างผู้ใช้ปลอมกิน quota 2000 ที่นั่งจนคนจริงสมัครไม่ได้
stack ทดสอบจึงแยก DB/network/พอร์ตทั้งชุด (`lt-*` prefix, network `su-loadtest-net`)

## เริ่มใช้งาน

```bash
# 1. ยก stack ทดสอบ (reuse image su-web:latest + student-union-server-backend:latest)
docker compose -f loadtest/stack/docker-compose.yml up -d

# 2. รันเทส
cd loadtest
./run.sh smoke      # ย่อส่วน เช็คว่าทุก script ทำงาน
./run.sh all        # เต็มสเกลครบชุด (~25 นาที)
./run.sh register   # หรือทีละ scenario: race|browse|map|eventday|proxy

# 3. เก็บกวาด
docker compose -f loadtest/stack/docker-compose.yml down -v   # ลบ DB ทดสอบทิ้ง
```

ผลอยู่ใน `results/<timestamp>/` — summary ของ k6 (`.txt`, `.json`) และ CPU/RAM
ของ container (`stats-*.log`, เก็บทุก 5 วินาที)

## Scenario

| script | จำลองอะไร | เกณฑ์ผ่านหลัก |
|---|---|---|
| `register-rush.js` | วินาทีเปิดรับสมัคร: 2000 คนเปิดหน้า + ทยอย POST สมัคร (~60KB/คน) จนที่นั่งเต็ม | ไม่มี 5xx, p95 หน้าเว็บ <1.5s, p95 สมัคร <15s |
| `capacity-race.js` | ที่นั่งเหลือ 50 แต่ 500 คนกด submit พร้อมกัน | สำเร็จ ≤50 เป๊ะ (DB กัน oversell), ที่เหลือ 409 ไม่ใช่ 5xx |
| `browse.js` | 2000 คนไล่เปิดหน้าเว็บ + JS chunks + API อ่าน | ไม่มี 5xx, p95 <1.5s |
| `map-bandwidth.js` | คนเปิดแผนที่ 3D (glb ~10MB/คน) ไต่ 100→500→1000 | ไม่มี 5xx — วัดเพดาน throughput ของ origin |
| `event-day.js` | วันงาน: staff 50 เช็คอิน BIB + admin 5 เปิด dashboard + ผู้เข้าร่วม 500 เปิดแอป | ไม่มี 5xx, p95 เช็คอิน <800ms |
| `proxy-overhead.js` | GET /capacity 300 req/s ผ่าน Next proxy vs ตรง backend | ส่วนต่าง p95 = ราคาของ proxy |

## สิ่งที่ต้องรู้ตอนอ่านผล

- **ยิงในเครื่องเดียวกัน = ไม่มี network latency จริง** ตัวเลข latency จะสวยกว่าของจริง
  ที่วิ่งผ่าน Cloudflare tunnel — ใช้ดู "คอขวดของ server" ไม่ใช่ "ประสบการณ์ผู้ใช้"
- **backend มี throttle ของ /auth อยู่แล้ว** (`ThrottleBacklog(40, 2000, 25s)` ใน
  `cmd/main.go` — bcrypt cost 10 ≈ 80ms/ครั้ง) สมัคร/ล็อกอินเกิน 40 พร้อมกันจะเข้าคิว
  เกิน 2000 คิวหรือรอเกิน 25s ได้ 429 — เป็นพฤติกรรมตั้งใจ ไม่ใช่ล่ม
- **DB pool จำกัด 20 connection** (`DB_MAX_CONNS` default, config/database.go)
- ตัวเลข map-bandwidth คือเพดานของ origin — production มี Cloudflare edge cache
  ช่วยรับ ถ้า cache header ของ `.glb` เปิดใช้ (ดูใน RESULTS.md)
- k6 รันใน Docker บน network เดียวกับ stack ทดสอบ (`web:3001` / `backend:8080`)
  — `DIRECT=1` สลับไปยิง backend ตรงโดยไม่ผ่าน Next proxy

## โครงไฟล์

- `stack/docker-compose.yml` — stack ทดสอบแยก (lt-postgres, lt-migrate, lt-backend, lt-web)
- `lib/data.js` — สร้าง student_id (`693xxxxxxx`), เบอร์ (`0xxxxxxxxx`), payload สมัคร ~60KB
- `run.sh` — orchestrator: reset DB → seed admin → รัน k6 → เก็บ docker stats → ตรวจ oversell
