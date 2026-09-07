#!/usr/bin/env python3
"""Slice design PDFs into section images with pdftoppm, driven by docs/slices.json.

Usage: pdf_slice.py docs/slices.json [--scale 1] [--only pc|sp] [--out build/img]

slices.json:
{
  "pc": {"pdf": "design/FOLLOW_LP_PC.pdf", "width": 1920,
         "pages": [{"page": 1, "frame": "PC-1", "height": 8826,
                    "slices": [{"name": "header", "y0": 0, "y1": 120}, ...]}]},
  "sp": {...}
}
Output: <out>/<pc|sp>/<frame>_<nn>_<name>.png (scale 1 => 1 PDF pt = 1 px; scale 2 => 2x).
Checks that slices in a page are contiguous and cover 0..height; prints gaps/overlaps.
"""
import json, os, subprocess, sys


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    opts = dict(a[2:].split("=") for a in sys.argv[1:] if a.startswith("--") and "=" in a)
    scale = float(opts.get("scale", 1))
    only = opts.get("only")
    out = opts.get("out", "build/img")
    spec = json.load(open(args[0]))
    dpi = 72 * scale
    for key, dev in spec.items():
        if only and key != only:
            continue
        os.makedirs(f"{out}/{key}", exist_ok=True)
        w = dev["width"]
        for pg in dev["pages"]:
            slices = pg["slices"]
            prev = 0
            for i, s in enumerate(slices):
                if abs(s["y0"] - prev) > 0.6:
                    print(f"  ! {pg['frame']} gap/overlap before {s['name']}: prev end {prev} -> y0 {s['y0']}")
                prev = s["y1"]
                y0 = round(s["y0"] * scale); y1 = round(s["y1"] * scale)
                name = f"{pg['frame']}_{i + 1:02d}_{s['name']}"
                path = f"{out}/{key}/{name}"
                cmd = ["pdftoppm", "-png", "-r", str(dpi), "-f", str(pg["page"]), "-l", str(pg["page"]),
                       "-x", "0", "-y", str(y0), "-W", str(round(w * scale)), "-H", str(y1 - y0),
                       "-singlefile", dev["pdf"], path]
                subprocess.run(cmd, check=True)
                print(f"  {name}.png  y {s['y0']}-{s['y1']} ({y1 - y0}px)")
            if abs(prev - pg["height"]) > 0.6:
                print(f"  ! {pg['frame']} last slice ends at {prev}, page height {pg['height']}")


if __name__ == "__main__":
    main()
