#!/usr/bin/env python3
"""สร้างไอคอนเว็บ + ภาพ Open Graph จากโลโก้ที่มีอยู่แล้วใน public/schools/

ผลลัพธ์ (Next.js เก็บไฟล์พวกนี้ตามชื่อไฟล์เฉพาะใน app/ แล้วใส่ <link>/<meta> ให้เอง
ดู node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/):

    app/favicon.ico          16/32/48 px   แท็บเบราว์เซอร์รุ่นเก่า
    app/icon.png             512 px        แท็บ/บุ๊กมาร์ก/ผลค้นหา
    app/apple-icon.png       180 px        ปุ่มลัดบนหน้าจอโฮมของ iOS
    app/opengraph-image.png  1200x630      การ์ดตอนแชร์ลิงก์ (LINE/Facebook/X)

ทำไมไอคอนใช้โลโก้ SU ไม่ใช่โลโก้ Walk Beyond the Wild: โลโก้กิจกรรมเป็นตัวอักษร
แนวนอนยาว ย่อเหลือ 32 px แล้วอ่านไม่ออก ส่วนโมโนแกรม "SU" เป็นรูปทรงตันอ่านออก
ทุกขนาด · ภาพ OG ที่มีที่ว่างเยอะกว่าจึงใช้โลโก้กิจกรรมเป็นตัวเอก

รันใหม่เมื่อโลโก้เปลี่ยน:  python3 scripts/brand-images.py   (ต้องมี Pillow)
"""
import pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SU_LOGO = ROOT / "public/schools/LOGO-02.png"        # โมโนแกรม SU + ตัวอักษร (ขาว โปร่ง)
WBW_LOGO = ROOT / "public/schools/wbw-logo.png"      # โลโก้กิจกรรม (ดำ โปร่ง)

GREEN = (27, 67, 50)      # --color-forestdeep ใน app/globals.css
CREAM = (250, 247, 240)   # --color-cream


def trimmed(path):
    im = Image.open(path).convert("RGBA")
    return im.crop(im.getchannel("A").getbbox())


def recolor(im, rgb):
    """ทาสีใหม่ทั้งภาพโดยเก็บ alpha เดิม — โลโก้กิจกรรมเป็นสีดำ ใช้บนพื้นเข้มไม่ได้"""
    out = Image.new("RGBA", im.size, (*rgb, 0))
    out.putalpha(im.getchannel("A"))
    return out


def fit(im, box):
    """ย่อให้พอดีกรอบโดยคงสัดส่วน"""
    s = min(box[0] / im.width, box[1] / im.height)
    return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)


def square_icon(size, pad_ratio=0.08, radius_ratio=0.0):
    """โมโนแกรม SU บนพื้นเขียว — ตัดเฉพาะส่วนโมโนแกรมด้านบน ไม่เอาตัวอักษรข้างล่าง"""
    su = trimmed(SU_LOGO)
    mono = su.crop((0, 0, su.width, int(su.height * 0.62)))   # ตัดคำว่า STUDENT UNION ออก
    mono = mono.crop(mono.getchannel("A").getbbox())
    canvas = Image.new("RGBA", (size, size), (*GREEN, 255))
    inner = int(size * (1 - pad_ratio * 2))
    m = fit(mono, (inner, inner))
    canvas.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2))
    if radius_ratio:
        from PIL import ImageDraw
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1],
                                               radius=int(size * radius_ratio), fill=255)
        canvas.putalpha(mask)
    return canvas


def og_image():
    """1200x630 · โลโก้กิจกรรมเป็นตัวเอก มีโลโก้ SU ตัวเล็กมุมล่าง"""
    W, H = 1200, 630
    im = Image.new("RGBA", (W, H), (*GREEN, 255))
    wbw = fit(recolor(trimmed(WBW_LOGO), CREAM), (int(W * 0.72), int(H * 0.52)))
    im.alpha_composite(wbw, ((W - wbw.width) // 2, int(H * 0.20)))
    su = fit(trimmed(SU_LOGO), (int(W * 0.20), int(H * 0.16)))
    im.alpha_composite(su, ((W - su.width) // 2, int(H * 0.78)))
    return im


def main():
    app = ROOT / "app"
    square_icon(512).convert("RGB").save(app / "icon.png")
    # apple-icon ไม่รองรับความโปร่ง — พื้นเขียวเต็มอยู่แล้ว มุมโค้ง iOS ตัดให้เอง
    square_icon(180, pad_ratio=0.10).convert("RGB").save(app / "apple-icon.png")
    ico = square_icon(256)
    ico.save(app / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    og_image().convert("RGB").save(app / "opengraph-image.png", optimize=True)
    for f in ("icon.png", "apple-icon.png", "favicon.ico", "opengraph-image.png"):
        p = app / f
        print(f"{p.relative_to(ROOT)}  {p.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
