#!/usr/bin/env python3
"""Flatten `pdftotext -bbox-layout` XML into one line per text line.

Usage: pdf_text_lines.py docs/pdf-text/PC-1.xml [--tsv]

Output columns: yMin  yMax  xMin  xMax  height(≈font px)  text
Coordinates are PDF points; for these files 1pt = 1px of the design width.
"""
import sys
import xml.etree.ElementTree as ET

NS = {"h": "http://www.w3.org/1999/xhtml"}


def main():
    path = sys.argv[1]
    tsv = "--tsv" in sys.argv
    root = ET.parse(path).getroot()
    page = root.find(".//h:page", NS)
    print(f"# page {page.get('width')}x{page.get('height')}")
    rows = []
    for block in page.findall(".//h:block", NS):
        for line in block.findall("h:line", NS):
            words = line.findall("h:word", NS)
            text = "".join(w.text or "" for w in words)
            # Illustrator letterspaced text comes out as one char per word; join with
            # no spaces when every word is a single char, else with spaces.
            if not all(len((w.text or "")) <= 1 for w in words):
                text = " ".join(w.text or "" for w in words)
            y0, y1 = float(line.get("yMin")), float(line.get("yMax"))
            x0, x1 = float(line.get("xMin")), float(line.get("xMax"))
            rows.append((y0, y1, x0, x1, text))
    rows.sort()
    for y0, y1, x0, x1, text in rows:
        if tsv:
            print(f"{y0:.1f}\t{y1:.1f}\t{x0:.1f}\t{x1:.1f}\t{y1 - y0:.1f}\t{text}")
        else:
            print(f"y={y0:7.1f}-{y1:7.1f} x={x0:7.1f}-{x1:7.1f} h={y1 - y0:5.1f}  {text}")


if __name__ == "__main__":
    main()
