# ผล Load Test — 12 ส.ค. 2026

**คำตอบสั้น: รับ 2000 คนพร้อมกันไหว** — ทุก scenario ผ่านหมด ไม่มี 5xx แม้แต่ครั้งเดียว
จากรวม ~730,000 requests และการเทสรันบน**เครื่องเดียวกับที่ deploy production จริง**
(24 cores / 15GB RAM) ตัวเลขจึงสะท้อนฮาร์ดแวร์จริง — แต่ยังไม่รวม Cloudflare tunnel
(ดูข้อจำกัดท้ายไฟล์)

ยิงใส่ stack ทดสอบแยก (`loadtest/stack/`) ที่ใช้ image เดียวกับ production
ผลดิบ: `results/25690812-023007/`

## ตัวเลขต่อ scenario

| scenario | โหลด | ผล | p95 |
|---|---|---|---|
| **register-rush** เปิดรับสมัคร | 2000 VU เปิดหน้าค้าง + สมัคร 40 คน/วิ (payload ~62KB มีรูป) จนเต็มโควตา | สำเร็จครบ 2000 พอดี, เกินได้ 409 (4,599), **0×5xx** | สมัคร 46ms · หน้าเว็บ 2.0ms · capacity 2.8ms |
| **capacity-race** ที่นั่งเหลือ 50, กด 500 คนพร้อมกัน | 500 POST วินาทีเดียวกัน | **สำเร็จ 50 เป๊ะ ไม่ oversell** (ตรวจ DB ซ้ำแล้ว), อีก 450 ได้ 409, 0×5xx | 1.02s ช่วงชิงล็อกแรงสุด |
| **browse** ใช้เว็บทั่วไป | 2000 VU ไล่หน้า + JS chunks + API | 421,341 req, **0 ล้มเหลว** | 9.1ms |
| **map** แผนที่ 3D 10MB | ไต่ 100→500→1000 VU ดาวน์โหลดพร้อมกัน | 49,273 ไฟล์ = 494GB, 0 ล้มเหลว, เฉลี่ย 1.7GB/s | โหลดไฟล์ 2.43s ที่ 1000 คนพร้อมกัน |
| **event-day** วันงาน | staff 50 เช็คอิน + admin 5 dashboard + ผู้ร่วม 500 | 22,928 req, 0 ล้มเหลว | เช็คอิน 1.3ms · dashboard 32ms |
| **proxy-overhead** | GET capacity 300 req/s | ผ่าน Next proxy p95 0.70ms vs ตรง backend 0.27ms | **proxy แพงแค่ ~0.4ms/req** |

CPU สูงสุดที่เห็น (จาก 24 cores): backend 1.8 cores (ช่วง bcrypt สมัคร) · web 1.0 core
(browse) / 2.6 cores (เสิร์ฟ glb) · postgres ไม่เกิน 0.12 core — **เหลือหัวอีกมาก**

## กลไกที่พิสูจน์แล้วว่าทำงานจริง

- **DB กัน oversell ได้จริง** (migration `000021`): 500 transaction ชิงที่นั่ง 50 ที่พร้อมกัน
  → เข้าได้ 50 คนเป๊ะ ที่เหลือ 409 "ที่นั่งเต็ม" ไม่มี error หลุดเป็น 5xx เลย
- **throttle ของ /auth** (`ThrottleBacklog(40, 2000, 25s)` ใน `cmd/main.go`) ไม่เคยถูกใช้จนตัน
  — ที่ 40 สมัคร/วินาที คิวแทบว่าง (สมัครเสร็จใน ~45ms) ยังรับได้อีกหลายเท่า
- **Next.js proxy ไม่ใช่คอขวด** — overhead ~0.4ms/req ที่ 300 req/s · ไม่จำเป็นต้องตั้ง
  `NEXT_PUBLIC_API_BASE` ให้ browser ยิง backend ตรง (สถาปัตยกรรมปัจจุบันใช้ต่อได้)

## สิ่งที่ควรแก้ (เรียงตามผลกระทบ)

1. **เพิ่ม cache header ให้ `/models/*`** — ตอนนี้ `mfu-map.glb` (10MB) ส่ง
   `Cache-Control: public, max-age=0` → Cloudflare edge **ไม่แคช** ทุกคนที่เปิด
   แผนที่ดึง 10MB ทะลุ tunnel มาที่ origin (2000 คน = ~20GB ผ่าน uplink ของเครื่องนี้
   ซึ่งช้ากว่า loopback ที่เทสได้ 1.7GB/s มาก — นี่คือความเสี่ยงจริงข้อเดียวที่เจอ)
   วิธีแก้: เพิ่ม `headers()` ใน `next.config.ts` ให้ `/models/:path*` เป็น
   `public, max-age=31536000, immutable` (ไฟล์ไม่เปลี่ยน ถ้าเปลี่ยนให้เปลี่ยนชื่อไฟล์)
   — JS chunks แคช immutable อยู่แล้ว เหลือแค่ models
2. **จุดที่จะตันก่อนเพื่อนถ้าโตกว่านี้: Node 1 core** — browse ที่ 2000 VU ใช้ web
   ครบ 1 core พอดี (Node single-threaded) latency ยังดี แต่ถ้าผู้ใช้จริงเกินนี้มาก
   ให้เพิ่ม replica ของ `web` (Docker แล้ว round-robin ผ่าน network alias ได้เลย)
3. **connection จาก IP เดียว** — ตอนเทสรอบแรก เครื่องยิง (IP เดียว) ใช้ ephemeral port
   หมดก่อนที่ server จะเหนื่อย (`cannot assign requested address` ที่ ~28k connection
   ค้าง TIME_WAIT) · production มีรูปร่างเดียวกัน: ทุก request เข้าจาก container
   `cloudflared` ตัวเดียว → ถ้างานจริงมีปัญหา "ต่อไม่ติดเป็นพักๆ" ทั้งที่ CPU ว่าง
   ให้สงสัยจุดนี้ก่อน (แก้ด้วย sysctl `net.ipv4.ip_local_port_range` กว้างขึ้น +
   `tcp_tw_reuse=1` บน host / ใน container cloudflared)

## ข้อจำกัดของการเทสนี้

- ยิงผ่าน docker network ในเครื่อง — **ไม่มี network latency จริง, ไม่มี TLS, ไม่ผ่าน
  Cloudflare tunnel** ตัวเลข latency ที่ผู้ใช้จริงเห็นจะสูงกว่านี้ (บวก RTT มือถือ +
  edge→origin) แต่คอขวดฝั่ง server ที่วัดได้ยังใช้ได้จริง
- throughput ของ map (1.7GB/s) คือ loopback — ของจริงถูกจำกัดด้วย uplink ของเครื่อง
  → ยิ่งตอกย้ำข้อแก้ที่ 1 (ให้ edge cache รับแทน)
- ถ้าอยากยืนยัน edge path จริง: เทสรอบเล็ก (เช่น 100 VU อ่านอย่างเดียว ไม่สมัคร)
  ใส่ hostname จริงนอกเวลาใช้งาน — อย่ายิง register ใส่ production เด็ดขาด

## รันซ้ำยังไง

ดู `README.md` — สรุป: `docker compose -f loadtest/stack/docker-compose.yml up -d`
แล้ว `./run.sh all` (ผลใหม่ลง `results/<timestamp>/` เทียบกับของเดิมได้)
