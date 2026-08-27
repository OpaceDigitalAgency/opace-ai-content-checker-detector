#!/usr/bin/env python3
"""Build deterministic WordPress.org icon and banner assets."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / ".wordpress-org"
SOURCE = ASSETS / "source" / "banner-direction-selected.png"
FONT_REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
NAVY = (3, 29, 69)
CYAN = (23, 201, 244)
BLUE = (0, 104, 179)
ORANGE = (255, 174, 40)
WHITE = (255, 255, 255)


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def build_banner() -> Image.Image:
    canvas = Image.new("RGB", (1544, 500), NAVY)
    source = Image.open(SOURCE).convert("RGB")
    scale = 500 / source.height
    source = source.resize((round(source.width * scale), 500), Image.Resampling.LANCZOS)
    canvas.paste(source, (1544 - source.width, 0))

    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    overlay_draw.rectangle((0, 0, 820, 500), fill=(3, 29, 69, 224))
    for x in range(620, 840, 20):
        alpha = max(0, 224 - (x - 620))
        overlay_draw.rectangle((x, 0, x + 20, 500), fill=(3, 29, 69, alpha))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), overlay)
    draw = ImageDraw.Draw(canvas)

    draw.text((74, 62), "OPACE AI CONTENT INTEGRITY", font=font(FONT_BOLD, 25), fill=CYAN)
    draw.text((72, 112), "Facts protected.", font=font(FONT_BOLD, 62), fill=WHITE)
    draw.text((72, 180), "Signals explained.", font=font(FONT_BOLD, 62), fill=ORANGE)
    draw.text(
        (75, 274),
        "Free WordPress content-integrity checks\nand honest hash-only receipts.",
        font=font(FONT_REGULAR, 27),
        fill=WHITE,
        spacing=10,
    )
    draw.rounded_rectangle((74, 389, 620, 446), radius=18, outline=CYAN, width=2, fill=(0, 65, 116, 170))
    draw.text((97, 403), "FREE LOCAL CHECKS  ·  EVIDENCE, NOT GUARANTEES", font=font(FONT_BOLD, 17), fill=WHITE)
    return canvas.convert("RGB")


def build_icon(size: int) -> Image.Image:
    scale = 4
    image = Image.new("RGB", (size * scale, size * scale), NAVY)
    draw = ImageDraw.Draw(image)
    pad = int(size * 0.21 * scale)
    left = pad
    right = size * scale - pad
    top = int(size * 0.18 * scale)
    bottom = int(size * 0.82 * scale)
    rail_width = max(7 * scale, int(size * 0.04 * scale))
    line_width = max(4 * scale, int(size * 0.021 * scale))

    draw.rounded_rectangle((left, top, left + rail_width, bottom), radius=rail_width // 2, fill=CYAN)
    draw.rounded_rectangle((right - rail_width, top, right, bottom), radius=rail_width // 2, fill=CYAN)
    for y_fraction in (0.31, 0.50, 0.69):
        y = int(size * y_fraction * scale)
        draw.line((left + rail_width, y, right - rail_width, y), fill=CYAN, width=line_width)
        radius = int(size * 0.095 * scale)
        centre = (size * scale // 2, y)
        draw.ellipse(
            (centre[0] - radius, centre[1] - radius, centre[0] + radius, centre[1] + radius),
            fill=NAVY,
            outline=CYAN,
            width=line_width,
        )
        tick = [
            (centre[0] - int(radius * 0.48), centre[1]),
            (centre[0] - int(radius * 0.12), centre[1] + int(radius * 0.34)),
            (centre[0] + int(radius * 0.56), centre[1] - int(radius * 0.40)),
        ]
        draw.line(tick, fill=ORANGE, width=line_width, joint="curve")

    return image.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    banner = build_banner()
    banner.save(ASSETS / "banner-1544x500.png", optimize=True)
    banner.resize((772, 250), Image.Resampling.LANCZOS).save(ASSETS / "banner-772x250.png", optimize=True)
    build_icon(256).save(ASSETS / "icon-256x256.png", optimize=True)
    build_icon(128).save(ASSETS / "icon-128x128.png", optimize=True)


if __name__ == "__main__":
    main()
