#!/usr/bin/env python3
"""Build the owner-selected raster WordPress.org icon and banner sizes."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
ASSETS = ROOT / ".wordpress-org"
LOCKUP = REPO / "docs" / "assets" / "brand-v4" / "opace-ai-content-checker-wp-logo.png"
BANNER = REPO / "docs" / "assets" / "opace-ai-checker-wordpress-banner-v4.png"

PRODUCT = "Opace AI Content Checker & Detector"
def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    banner = Image.open(BANNER).convert("RGB").resize((1544, 500), Image.Resampling.LANCZOS)
    banner.save(ASSETS / "banner-1544x500.png", optimize=True)
    banner.resize((772, 250), Image.Resampling.LANCZOS).save(
        ASSETS / "banner-772x250.png", optimize=True
    )
    lockup = Image.open(LOCKUP).convert("RGB")
    lockup.resize((256, 256), Image.Resampling.LANCZOS).save(
        ASSETS / "icon-256x256.png", optimize=True
    )
    lockup.resize((128, 128), Image.Resampling.LANCZOS).save(
        ASSETS / "icon-128x128.png", optimize=True
    )
    print(f"Directory assets rebuilt for: {PRODUCT}")
    print("Chrome and WordPress use separate owner-selected raster identities.")


if __name__ == "__main__":
    main()
