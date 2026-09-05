#!/usr/bin/env python3
"""Build the raster-only v3 brand family from the canonical PNG mark.

The README hero and the GitHub social preview are no longer built here. Since
5 September 2026 both are derived from the v4 product banner
(``docs/assets/brand-v4/opace-ai-content-checker-wp-banner.png``): the hero is a
1544 x 500 resize of it, the social preview a 1280 x 640 crop taken from the left
of the same banner, cut between the wordmark and the illustration. Regenerating
them from the v3 mark would silently replace the shipped artwork with the older
generated design, so ``build_hero`` is kept only for reference and is not called.
"""

from __future__ import annotations

import base64
import hashlib
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/assets/opace-ai-content-checker-detector-logo-v3.png"
# Owned by the v4 banner, not by this script. See the module docstring.
BANNER = ROOT / "docs/assets/brand-v4/opace-ai-content-checker-wp-banner.png"
HERO = ROOT / "docs/assets/opace-ai-content-checker-detector-hero-v3.png"
SOCIAL = ROOT / "docs/assets/opace-ai-content-checker-detector-social-preview-v3.png"
WP_IMAGES = ROOT / "wordpress/opace-ai-content-checker-detector/assets/images"
REPORT_ASSETS = ROOT / "shared/report/assets"
REPORT_LOGO = ROOT / "shared/report/logo.mjs"
PRESENTATION = ROOT / "shared/presentation/checker-result-presentation.mjs"

FONT_REGULAR = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
FONT_BOLD = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")
NAVY = (3, 17, 41)
CYAN = (23, 201, 244)
ORANGE = (255, 166, 77)
WHITE = (255, 255, 255)
MUTED = (195, 211, 232)


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def background(size: tuple[int, int]) -> Image.Image:
    width, height = size
    canvas = Image.new("RGBA", size, NAVY + (255,))
    glow = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    draw.ellipse((-width // 5, -height // 2, width // 2, height), fill=(23, 201, 244, 38))
    draw.ellipse((width * 2 // 3, height // 3, width * 6 // 5, height * 4 // 3), fill=(255, 166, 77, 24))
    return Image.alpha_composite(canvas, glow.filter(ImageFilter.GaussianBlur(max(size) // 14)))


def build_hero(size: tuple[int, int], destination: Path) -> None:
    width, height = size
    canvas = background(size)
    mark_edge = round(height * 0.48)
    mark = Image.open(SOURCE).convert("RGBA").resize((mark_edge, mark_edge), Image.Resampling.LANCZOS)
    mark_x = round(width * 0.065)
    mark_y = (height - mark_edge) // 2
    canvas.alpha_composite(mark, (mark_x, mark_y))

    draw = ImageDraw.Draw(canvas)
    left = mark_x + mark_edge + round(width * 0.06)
    kicker_size = round(height * 0.034)
    title_size = round(height * 0.079)
    sub_size = round(height * 0.030)
    draw.text((left, round(height * 0.22)), "OPACE", font=font(FONT_BOLD, kicker_size), fill=CYAN)
    draw.multiline_text(
        (left, round(height * 0.29)),
        "Free AI Content Checker,\nDetector & Watermark Tools",
        font=font(FONT_BOLD, title_size),
        fill=WHITE,
        spacing=round(title_size * 0.18),
    )
    draw.multiline_text(
        (left, round(height * 0.57)),
        "By Opace. WordPress plugin, Chrome extension,\nAstro integration, CLI and Python engine.",
        font=font(FONT_REGULAR, sub_size),
        fill=MUTED,
        spacing=round(sub_size * 0.42),
    )
    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(destination, optimize=True)


def replace_export(source: str, name: str, value: str) -> str:
    pattern = rf"export const {re.escape(name)} =\s*'[^']*';"
    replacement = f"export const {name} =\n  '{value}';"
    updated, count = re.subn(pattern, replacement, source, count=1, flags=re.DOTALL)
    if count != 1:
        raise RuntimeError(f"Could not replace {name}")
    return updated


def write_embedded_logos() -> None:
    REPORT_ASSETS.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGB")
    png_path = REPORT_ASSETS / "opace-logo-96.png"
    jpeg_path = REPORT_ASSETS / "opace-logo-128.jpg"
    source.resize((96, 96), Image.Resampling.LANCZOS).save(png_path, optimize=True)
    source.resize((128, 128), Image.Resampling.LANCZOS).save(jpeg_path, quality=82, optimize=True)
    png64 = base64.b64encode(png_path.read_bytes()).decode("ascii")
    jpeg64 = base64.b64encode(jpeg_path.read_bytes()).decode("ascii")

    module = REPORT_LOGO.read_text()
    module = replace_export(module, "LOGO_PNG_96_BASE64", png64)
    module = replace_export(module, "LOGO_JPEG_128_BASE64", jpeg64)
    module = re.sub(
        r"docs/assets/opace-ai-content-[^\n]+\.png\n \* \(SHA-256 [a-f0-9]+, 1024 x 1024\)\.",
        f"docs/assets/{SOURCE.name}\n * (SHA-256 {hashlib.sha256(SOURCE.read_bytes()).hexdigest()}, 1024 x 1024).",
        module,
        count=1,
    )
    REPORT_LOGO.write_text(module)

    presentation = PRESENTATION.read_text()
    presentation = replace_export(presentation, "PRODUCT_LOGO_DATA_URI", f"data:image/png;base64,{png64}")
    presentation = re.sub(r"Source: docs/assets/[^\n]+", f"Source: docs/assets/{SOURCE.name}", presentation, count=1)
    presentation = re.sub(
        r"Source SHA-256: [a-f0-9]+",
        f"Source SHA-256: {hashlib.sha256(SOURCE.read_bytes()).hexdigest()}",
        presentation,
        count=1,
    )
    presentation = re.sub(
        r"Resized PNG SHA-256: [a-f0-9]+",
        f"Resized PNG SHA-256: {hashlib.sha256(png_path.read_bytes()).hexdigest()}",
        presentation,
        count=1,
    )
    PRESENTATION.write_text(presentation)


def write_runtime_tiles() -> None:
    WP_IMAGES.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGB").resize((256, 256), Image.Resampling.LANCZOS)
    source.save(WP_IMAGES / "opace-ai-content-checker-detector-logo-256.webp", lossless=True)
    source.save(WP_IMAGES / "opace-ai-content-checker-detector-logo-256.jpg", quality=86, optimize=True)


def main() -> None:
    source = Image.open(SOURCE)
    if source.size != (1024, 1024) or source.format != "PNG":
        raise RuntimeError("The canonical v3 mark must be a 1024 x 1024 PNG")
    # The hero and social preview are banner-derived and are deliberately not
    # rebuilt here; overwriting them would restore the superseded v3 design.
    for banner_derived in (HERO, SOCIAL):
        if not banner_derived.exists():
            raise RuntimeError(
                f"{banner_derived.name} is missing; re-cut it from {BANNER.name}"
            )
    write_runtime_tiles()
    write_embedded_logos()
    print(WP_IMAGES / "opace-ai-content-checker-detector-logo-256.webp")
    print(REPORT_ASSETS / "opace-logo-96.png")


if __name__ == "__main__":
    main()
