#!/usr/bin/env python3
"""Sample colours from a PNG without Pillow.

Usage:
  pngpick.py img.png at X Y [X Y ...]          -> hex colour at each point
  pngpick.py img.png darkest X Y W H           -> darkest pixel in region (text colour)
  pngpick.py img.png mode X Y W H              -> most frequent colour in region (background)
"""
import sys, zlib, struct
from collections import Counter


def read_rgb(path):
    data = open(path, "rb").read()
    pos = 8; idat = []
    while pos < len(data):
        n = struct.unpack(">I", data[pos:pos + 4])[0]
        t = data[pos + 4:pos + 8]; body = data[pos + 8:pos + 8 + n]; pos += 12 + n
        if t == b"IHDR":
            w, h, depth, ctype, _, _, il = struct.unpack(">IIBBBBB", body)
        elif t == b"IDAT":
            idat.append(body)
        elif t == b"IEND":
            break
    assert depth == 8 and il == 0
    bpp = {0: 1, 2: 3, 4: 2, 6: 4}[ctype]
    raw = zlib.decompress(b"".join(idat)); stride = w * bpp
    rows = []; prev = bytearray(stride); p = 0
    for _ in range(h):
        ft = raw[p]; p += 1
        cur = bytearray(raw[p:p + stride]); p += stride
        for i in range(stride):
            a = cur[i - bpp] if i >= bpp else 0; b = prev[i]; c = prev[i - bpp] if i >= bpp else 0
            if ft == 1: cur[i] = (cur[i] + a) & 255
            elif ft == 2: cur[i] = (cur[i] + b) & 255
            elif ft == 3: cur[i] = (cur[i] + ((a + b) >> 1)) & 255
            elif ft == 4:
                pa = abs(b - c); pb = abs(a - c); pc = abs(a + b - 2 * c)
                cur[i] = (cur[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        prev = cur; rows.append(bytes(cur))
    def px(x, y):
        r = rows[y]
        if bpp == 1: return (r[x], r[x], r[x])
        if bpp == 2: return (r[2 * x],) * 3
        return tuple(r[bpp * x:bpp * x + 3])
    return w, h, px


def hx(c): return "#%02x%02x%02x" % c


def main():
    path, cmd, *nums = sys.argv[1:]
    nums = [int(float(n)) for n in nums]
    w, h, px = read_rgb(path)
    if cmd == "at":
        for x, y in zip(nums[::2], nums[1::2]):
            print(f"({x},{y}) {hx(px(x, y))}")
    else:
        x, y, rw, rh = nums
        pts = [px(i, j) for j in range(y, min(y + rh, h)) for i in range(x, min(x + rw, w))]
        if cmd == "darkest":
            print(hx(min(pts, key=sum)))
        elif cmd == "mode":
            for c, n in Counter(pts).most_common(3):
                print(hx(c), n)


if __name__ == "__main__":
    main()
