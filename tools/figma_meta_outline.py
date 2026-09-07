#!/usr/bin/env python3
"""Summarise a get_metadata XML dump (docs/figma-meta/*.xml) for section-ledger work.

Usage: figma_meta_outline.py docs/figma-meta/PC-1_14-6.xml [--minw 1900] [--depth 2]

Prints, in frame-relative coordinates (the dump's x/y are already relative to the
root frame):
  1. direct children of each top-level group, sorted by y (with bbox, node count)
  2. every rounded-rectangle (CTA / card candidates)
  3. full-width nodes (width >= --minw) — background bands = section boundaries
"""
import sys, re
import xml.etree.ElementTree as ET


def parse(path):
    return ET.parse(path).getroot()


def num(el, k):
    return float(el.get(k, "0"))


def bbox(el):
    x, y, w, h = num(el, "x"), num(el, "y"), num(el, "width"), num(el, "height")
    return x, y, x + w, y + h


def count(el):
    return sum(1 for _ in el.iter()) - 1


def fmt(el, indent=0):
    x0, y0, x1, y1 = bbox(el)
    return (f"{' ' * indent}{el.tag:<18} {el.get('id'):<8} {el.get('name')[:22]:<22} "
            f"x={x0:8.1f} y={y0:8.1f} w={x1 - x0:8.1f} h={y1 - y0:8.1f} (y1={y1:8.1f}) n={count(el)}")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    opts = dict(a[2:].split("=") for a in sys.argv[1:] if a.startswith("--") and "=" in a)
    minw = float(opts.get("minw", 1900))
    root = parse(args[0])
    print(fmt(root))
    print("\n== 1. direct children of top-level groups (sorted by y) ==")
    for g in root:
        print("\n" + fmt(g, 1))
        kids = sorted(list(g), key=lambda e: (num(e, "y"), num(e, "x")))
        for k in kids:
            print(fmt(k, 4))
    print("\n== 2. rounded-rectangles ==")
    for el in sorted(root.iter("rounded-rectangle"), key=lambda e: (num(e, "y"), num(e, "x"))):
        print(fmt(el, 2))
    print(f"\n== 3. full-width nodes (width >= {minw:g}) ==")
    for el in sorted((e for e in root.iter() if num(e, "width") >= minw and e is not root),
                     key=lambda e: (num(e, "y"), num(e, "x"))):
        print(fmt(el, 2))


if __name__ == "__main__":
    main()
