"""One-time screenshot optimization. Requires Pillow; outputs are committed."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / "static/portfolio"

for name in ["project3-gameplay", "sprint1-gameplay"]:
    image = ImageOps.fit(Image.open(MEDIA / f"{name}.png").convert("RGB"), (1280, 720), method=Image.Resampling.LANCZOS)
    image.save(MEDIA / f"{name}.webp", quality=86, method=6)

image = Image.new("RGB", (1200, 630), "#10171c")
draw = ImageDraw.Draw(image)
font_path = "C:/Windows/Fonts/malgun.ttf"
title = ImageFont.truetype(font_path, 52)
body = ImageFont.truetype(font_path, 25)
small = ImageFont.truetype(font_path, 21)
draw.text((64, 100), "이성재", font=title, fill="#f1f4f5")
draw.text((64, 184), "게임 디자인 포트폴리오", font=body, fill="#b9d3de")
draw.text((64, 382), "5일 뒤 마왕", font=body, fill="#f1f4f5")
draw.text((64, 428), "Visual Shooting Code", font=body, fill="#f1f4f5")
draw.text((64, 525), "Game Development / Game Design", font=small, fill="#afbdc4")
shot = ImageOps.fit(Image.open(MEDIA / "project3-gameplay.png").convert("RGB"), (600, 486), method=Image.Resampling.LANCZOS)
image.paste(shot, (552, 72))
image.save(MEDIA / "og-portfolio.png", optimize=True)
print("Prepared two 1280×720 WebP screenshots and a 1200×630 sharing image.")
