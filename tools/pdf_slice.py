#!/usr/bin/env python3
"""Slice design PDFs into section images with pdftocairo, driven by docs/slices.json.

Usage: pdf_slice.py docs/slices.json [--scale N] [--only pc|sp] [--out build/img]

slices.json:
{
  "pc": {"pdf": "design/FOLLOW_LP_PC.pdf", "width": 1920, "scale": 2,
         "pages": [{"page": 1, "frame": "PC-1", "height": 8826,
                    "slices": [{"name": "header", "y0": 0, "y1": 120}, ...]}]},
  "sp": {"pdf": "design/FOLLOW_LP_SP.pdf", "width": 750, "scale": 1, "pages": [...]}
}
Output: <out>/<pc|sp>/<frame>_<nn>_<name>.png
  scale 1 => 72dpi, 1 PDF pt = 1 px; scale 2 => 144dpi, 1 pt = 2 px (PC は 2x 素材を CSS 幅 1920 に表示)。
  scale は device ごとに slices.json の "scale" で指定する（既定 1）。--scale=N は全 device への上書き。
Renderer: pdftocairo（2026-09-07 改定）。pdftoppm(Splash) は stroke adjust で細線幅が不揃いになるため使わない。
Checks that slices in a page are contiguous and cover 0..height; prints gaps/overlaps.
"""
import json, os, subprocess, sys


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    opts = dict(a[2:].split("=") for a in sys.argv[1:] if a.startswith("--") and "=" in a)
    only = opts.get("only")
    out = opts.get("out", "build/img")
    spec = json.load(open(args[0]))
    for key, dev in spec.items():
        if only and key != only:
            continue
        scale = int(opts["scale"]) if "scale" in opts else int(dev.get("scale", 1))
        dpi = 72 * scale
        os.makedirs(f"{out}/{key}", exist_ok=True)
        w = dev["width"]
        print(f"[{key}] pdftocairo -r {dpi} (scale {scale}, width {w * scale}px)")
        for pg in dev["pages"]:
            slices = pg["slices"]
            prev = 0
            for i, s in enumerate(slices):
                if abs(s["y0"] - prev) > 0.6:
                    print(f"  ! {pg['frame']} gap/overlap before {s['name']}: prev end {prev} -> y0 {s['y0']}")
                prev = s["y1"]
                if s["y0"] != int(s["y0"]) or s["y1"] != int(s["y1"]):
                    print(f"  ! {pg['frame']} {s['name']}: non-integer boundary {s['y0']}-{s['y1']}")
                y0 = int(s["y0"]) * scale
                y1 = int(s["y1"]) * scale
                name = f"{pg['frame']}_{i + 1:02d}_{s['name']}"
                path = f"{out}/{key}/{name}"
                cmd = ["pdftocairo", "-png", "-r", str(dpi), "-f", str(pg["page"]), "-l", str(pg["page"]),
                       "-x", "0", "-y", str(y0), "-W", str(w * scale), "-H", str(y1 - y0),
                       "-singlefile", dev["pdf"], path]
                subprocess.run(cmd, check=True)
                print(f"  {name}.png  y {s['y0']}-{s['y1']} ({w * scale}x{y1 - y0}px)")
            if abs(prev - pg["height"]) > 0.6:
                print(f"  ! {pg['frame']} last slice ends at {prev}, page height {pg['height']}")


if __name__ == "__main__":
    main()
