# โมเดล 3D ที่ใช้ในหน้า Landing (`/landing`)

รวมทุกไฟล์ประมาณ 93 KB — เลือกเฉพาะโมเดล low-poly ตัวเล็ก เพราะงานนี้คนเข้าพร้อมกัน
หลักพันและส่วนใหญ่อยู่บนมือถือ

> ⚠️ **หลายชิ้นเป็น CC BY 4.0 = ต้องแสดงเครดิต** เครดิตย่อแสดงอยู่มุมล่างซ้ายของหน้า
> (`t.landing.credit` ใน `lib/i18n/dictionaries.ts`) และรายละเอียดเต็มอยู่ในไฟล์นี้
> ถ้าเอาโมเดลไหนออก ให้ปรับเครดิตตามด้วย

## รายการ

| ไฟล์ | โมเดล | ผู้สร้าง | สัญญาอนุญาต | ที่มา |
| --- | --- | --- | --- | --- |
| `tree.glb` | Tree | Poly by Google | **CC BY 4.0** | [poly.pizza](https://poly.pizza/m/6pwiq7hSrHr) |
| `rock-small.glb` | Rock | Quaternius | CC0 | [poly.pizza](https://poly.pizza/m/4MUaQTcDdc) |
| `rock-large.glb` | Rock Large | Quaternius | CC0 | [poly.pizza](https://poly.pizza/m/54jZKTAt5p) |
| `mountain-snow.glb` | Mountain with Snow | Matthew Creighton | **CC BY 4.0** | [poly.pizza](https://poly.pizza/m/0VBAQNbpNcl) |
| `mountain-ridge.glb` | Mountain | jeremy | **CC BY 4.0** | [poly.pizza](https://poly.pizza/m/0Fl55ZzsVzT) |
| `snowy-hills.glb` | Snowy Hills | Nebel | **CC BY 4.0** | [poly.pizza](https://poly.pizza/m/1wt1DXCt-nQ) |
| `signpost.glb` | Signpost | Kenney | CC0 | [poly.pizza](https://poly.pizza/m/3U2lj1gpeH) |
| `grass.glb` | Grass Patch 01 | Jarlan Perez | **CC BY 4.0** | [poly.pizza](https://poly.pizza/m/6XEjsza95ys) |

### หน้าสมัคร (`/register`) — ต้นไม้ที่โตตาม step

ไม่มีไฟล์เพิ่ม · ใช้ `tree.glb` ต้นเดียวกับป่ารอบ ๆ แล้วไล่ขนาดตาม step ของฟอร์ม
(ดู `PHASE_HEIGHTS` ใน `components/register/GrowingPlant.tsx`)

> ⚠️ `tree.glb` เป็น **CC BY 4.0 = ต้องแสดงเครดิตบนหน้าที่ใช้** — `ForestScene.tsx`
> แสดง `t.landing.credit` ไว้มุมล่างซ้ายเหมือนหน้า landing ห้ามเอาออก

CC BY 4.0: https://creativecommons.org/licenses/by/4.0/
CC0 1.0: https://creativecommons.org/publicdomain/zero/1.0/

## ที่ไม่ได้โหลดมา

พื้นป่า, ทางเดินดิน, บ่อน้ำ, ดาว และละอองในอากาศ สร้างเป็น procedural geometry
ในโค้ด (`TrailScene.tsx`) ไม่มีข้อผูกมัดเรื่องสัญญาอนุญาต

ท้องฟ้าใช้ `<Sky>` ของ `@react-three/drei` (Rayleigh/Mie scattering ของ three.js
examples · MIT ติดมากับ dependency อยู่แล้ว) โดยเลื่อนตำแหน่งดวงอาทิตย์ตาม scroll
เป็นวงจรกลางวัน — ดู `sunAt()` ใน `trail.ts`

## เปลี่ยนโมเดล

`components/landing/models.tsx` normalize ขนาด + จัดกึ่งกลางแกน X/Z ด้วย `Box3`
ตอน runtime — วางไฟล์ `.glb` ใหม่ทับชื่อเดิมได้เลย ไม่ต้องจูน scale ในโค้ด

**แต่ต้องรัน `node scripts/glb-info.mjs` แล้วอัปเดตค่า `FOOTPRINT` ใน
`components/landing/trail.ts` ด้วย** — ค่านั้นคือตัวกำหนดว่าของจะวางห่างจากทางเดิน
เท่าไหร่ ถ้าไม่อัปเดตแล้วโมเดลใหม่อ้วนกว่าเดิม มันจะไปยืนคร่อมทางทันที

(อย่าลืมแก้ตารางเครดิตข้างบนด้วย)

---

# โมเดลแผนที่ 3D หน้า `/map`

| ไฟล์ | ขนาด | เนื้อหา | ที่มา |
| --- | --- | --- | --- |
| `mfu-map.glb` | ~10 MB | ภูมิประเทศ + อาคาร รอบมหาวิทยาลัย 4.5 x 5.2 กม. | ส่งออกจาก [maps3d.io](https://maps3d.io) |

> ⚠️ **ต้องแสดงเครดิตบนหน้าที่ใช้** ตามเงื่อนไขของ maps3d.io — แสดงอยู่มุมล่างของ
> `app/map/page.tsx` (`t.map.imagery` / `t.map.topo`) ห้ามเอาออก
> - ภาพถ่ายดาวเทียม: [Satlas · Allen Institute for AI](https://satlas.allen.ai/)
> - อาคาร/ถนน: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)

## ไฟล์ต้นทางกับวิธีแปลง

ไฟล์ที่ maps3d.io ส่งออกมาเป็น `.obj` **272 MB** (3.5 ล้านจุด · 1.9 ล้านสามเหลี่ยม)
บวก `maptexture.jpg` อีก 2 MB — ส่งให้เบราว์เซอร์ตรง ๆ ไม่ได้ ต้องแปลงก่อน:

```sh
# 1) .obj + .mtl + texture  →  .glb (ยังใหญ่อยู่ ~112 MB)
npx obj2gltf -i maps3d-<วันที่>.obj -o mfu-raw.glb -b

# 2) รวม mesh / ลดจำนวนสามเหลี่ยม / บีบ texture เป็น WebP / บีบ mesh ด้วย meshopt
npx @gltf-transform/cli optimize mfu-raw.glb mfu-map.glb \
  --compress meshopt --texture-compress webp --simplify-error 0.002
```

ผลลัพธ์: **652,296 สามเหลี่ยม · 2 mesh · 2 material** (จาก 1,972 ออบเจกต์ในไฟล์เดิม)
เหลือ 2 draw call · กล่องครอบ 4479 x 5162 x 343 เมตร

เลือก **meshopt ไม่ใช่ draco** เพราะตัว decoder ของ meshopt มากับ `three-stdlib`
ในแพ็กเกจอยู่แล้ว ส่วน draco ตัว `useGLTF` ของ drei ตั้งค่าเริ่มต้นให้ไปโหลด decoder
จาก CDN ของ google ซึ่งเว็บนี้ไม่พึ่งของนอก (ดูที่เรียก `useGLTF(MODEL, false, true)`
ใน `components/map/MapScene.tsx` — `false` คือปิด draco)

โฟลเดอร์ต้นทางที่แตกจาก zip **ไม่ได้อยู่ใน git** (ดู `.gitignore`) ถ้าจะแปลงใหม่
ให้เอา zip จาก maps3d.io มาแตกแล้วรันคำสั่งข้างบนซ้ำ

## เส้นทางสีเขียวบนแผนที่ (ถนนวงในรอบมหาวิทยาลัย)

เส้นทางไม่ได้ลากด้วยมือ และไม่ได้ดึงออกมาจากตัวโมเดล — ถนนในไฟล์ `.obj` มีอยู่จริง
(`roadGroup_arterial/collector/local/service/paths`) แต่เป็น "ริบบิ้นผิวถนน" ไม่ใช่
เส้นกึ่งกลาง แถมตอนบีบไฟล์ทุก material ถูกยุบรวมเหลือ 2 ก้อน จึงแยกถนนออกมาไม่ได้แล้ว

พิกัดใน `components/map/campusRoute.ts` ได้มาจาก OpenStreetMap ซึ่งเป็นแหล่งเดียวกับที่
maps3d.io ใช้วางถนนลงบนโมเดล ขั้นตอน (ทำครั้งเดียว ผลอยู่ในไฟล์ .ts แล้ว):

1. ดึง `way["highway"]` ในกรอบเดียวกับโมเดลจาก Overpass API
   (เซิร์ฟเวอร์หลัก `overpass-api.de` ล่มช่วงที่ทำ ใช้ mirror แทนได้)
2. หั่น way ตามจุดที่มี way อื่นผ่าน (OSM ตัด way ตามแท็ก ไม่ใช่ตามทางแยก
   ถ้าต่อกราฟจากปลาย way อย่างเดียวจะหาวงไม่เจอเลย)
3. หาวงปิดทุกวงที่ใหญ่กว่า 0.1 ตร.กม. แล้วคัดเฉพาะวงที่ "ล้อมรอบใจกลางกลุ่มอาคาร มฟล."
   เหลือวงเดียว = 0.91 ตร.กม. · รอบวง 4.37 กม. (วงใหญ่ที่วนออกไปทางป่าฝั่งตะวันออก
   ไม่ได้ล้อมกลุ่มอาคาร จึงตกไปตั้งแต่ขั้นนี้ — ตรงกับที่ต้องการคือ "ถนนวงใน")
4. lat/lon → Web Mercator → พิกัดโมเดล: `x = mercX - originX`, `z = -(mercY - originY)`
   โดย origin มาจาก `sceneOrigin` ใน `metadata.json` ของไฟล์ส่งออก
5. ค่า y อ่านจากผิว TIN ในไฟล์ `.obj` โดยตรง (interpolate ในสามเหลี่ยมที่จุดนั้นตกอยู่)
   เก็บลงไฟล์เลย ไม่ต้อง raycast ตอน runtime

**ตรวจแล้ว 2 ชั้น**: (ก) จับคู่ตำแหน่งอาคาร OSM กับอาคารในไฟล์ `.obj` ได้ค่าเฉลี่ยห่างกัน
4.0 ม. (ถ้าทิศ z ไม่กลับด้านจะห่าง 93.9 ม.) (ข) เอาตัวเลขในไฟล์ `.ts` ฉายกลับลงบน
`maptexture.jpg` แล้วเส้นทับถนนวงในพอดี

> ถ้าส่งออกโมเดลใหม่จาก maps3d.io ด้วยกรอบอื่น **ต้องคำนวณเส้นทางใหม่ทั้งชุด**
> เพราะพิกัดผูกกับ `sceneOrigin` ของไฟล์นั้น ๆ
