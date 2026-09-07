#!/usr/bin/env python3
"""Pure-Python PNG comparison (no Pillow/numpy required).

Usage: pngdiff.py A.png B.png [--tol 48] [--band 100]

Reports, for each image: size, first/last non-white content row.
For the pair: fraction of differing pixels (grayscale |a-b| > tol) over the
common area, and the bands (row ranges) with the highest mismatch so the
difference can be located. Widths/heights may differ by a few px; the
comparison uses the top-left common area.
"""
import sys, zlib, struct, json


def read_png(path):
    with open(path, "rb") as f:
        data = f.read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG"
    pos = 8
    idat = []
    w = h = bitdepth = ctype = interlace = None
    while pos < len(data):
        length = struct.unpack(">I", data[pos:pos + 4])[0]
        typ = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if typ == b"IHDR":
            w, h, bitdepth, ctype, _, _, interlace = struct.unpack(">IIBBBBB", body)
        elif typ == b"IDAT":
            idat.append(body)
        elif typ == b"IEND":
            break
    assert bitdepth == 8 and interlace == 0, f"unsupported PNG (depth {bitdepth}, interlace {interlace})"
    bpp = {0: 1, 2: 3, 4: 2, 6: 4}[ctype]
    raw = zlib.decompress(b"".join(idat))
    stride = w * bpp
    gray = []  # list of bytes rows (grayscale)
    prev = bytearray(stride)
    p = 0
    for _ in range(h):
        ft = raw[p]
        p += 1
        cur = bytearray(raw[p:p + stride])
        p += stride
        if ft == 1:
            for i in range(bpp, stride):
                cur[i] = (cur[i] + cur[i - bpp]) & 255
        elif ft == 2:
            for i in range(stride):
                cur[i] = (cur[i] + prev[i]) & 255
        elif ft == 3:
            for i in range(stride):
                left = cur[i - bpp] if i >= bpp else 0
                cur[i] = (cur[i] + ((left + prev[i]) >> 1)) & 255
        elif ft == 4:
            for i in range(stride):
                a = cur[i - bpp] if i >= bpp else 0
                b = prev[i]
                c = prev[i - bpp] if i >= bpp else 0
                pa = abs(b - c); pb = abs(a - c); pc = abs(a + b - 2 * c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                cur[i] = (cur[i] + pr) & 255
        prev = cur
        if bpp == 1:
            gray.append(bytes(cur))
        elif bpp == 2:
            gray.append(bytes(cur[0::2]))
        else:
            r = cur[0::bpp]; g = cur[1::bpp]; b = cur[2::bpp]
            if bpp == 4:  # composite alpha over white
                a = cur[3::bpp]
                row = bytes(((r[i] * 299 + g[i] * 587 + b[i] * 114) // 1000 * a[i] + 255 * (255 - a[i])) // 255 for i in range(w))
            else:
                row = bytes((r[i] * 299 + g[i] * 587 + b[i] * 114) // 1000 for i in range(w))
            gray.append(row)
    return w, h, gray


def content_bounds(gray, white=245):
    first = last = None
    for y, row in enumerate(gray):
        if min(row) < white:
            first = y
            break
    for y in range(len(gray) - 1, -1, -1):
        if min(gray[y]) < white:
            last = y
            break
    return first, last


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    opts = dict(a[2:].split("=") for a in sys.argv[1:] if a.startswith("--") and "=" in a)
    tol = int(opts.get("tol", 48)); band = int(opts.get("band", 100))
    wa, ha, ga = read_png(args[0])
    wb, hb, gb = read_png(args[1])
    w = min(wa, wb); h = min(ha, hb)
    diff_total = 0
    bands = []
    for y0 in range(0, h, band):
        d = 0
        for y in range(y0, min(y0 + band, h)):
            ra = ga[y]; rb = gb[y]
            d += sum(1 for x in range(w) if abs(ra[x] - rb[x]) > tol)
        bands.append((y0, d / (w * (min(y0 + band, h) - y0))))
        diff_total += d
    worst = sorted(bands, key=lambda t: -t[1])[:5]
    out = {
        "a": {"file": args[0], "w": wa, "h": ha, "content_rows": content_bounds(ga)},
        "b": {"file": args[1], "w": wb, "h": hb, "content_rows": content_bounds(gb)},
        "tol": tol, "compared": [w, h],
        "diff_fraction": round(diff_total / (w * h), 5),
        "worst_bands": [{"y0": y0, "frac": round(f, 4)} for y0, f in worst],
    }
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
