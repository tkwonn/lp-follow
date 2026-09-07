#!/usr/bin/env python3
"""Pure-Python PNG crop (no Pillow required). sips ignores --cropOffset in
some cases, so this is the reliable fallback.

Usage: pngcrop.py in.png out.png x y w h
"""
import sys, zlib, struct


def decode(path):
    data = open(path, "rb").read()
    pos = 8; idat = []
    while pos < len(data):
        length = struct.unpack(">I", data[pos:pos + 4])[0]
        typ = data[pos + 4:pos + 8]; body = data[pos + 8:pos + 8 + length]; pos += 12 + length
        if typ == b"IHDR":
            w, h, depth, ctype, _, _, il = struct.unpack(">IIBBBBB", body)
        elif typ == b"IDAT":
            idat.append(body)
        elif typ == b"IEND":
            break
    assert depth == 8 and il == 0
    bpp = {0: 1, 2: 3, 4: 2, 6: 4}[ctype]
    raw = zlib.decompress(b"".join(idat)); stride = w * bpp
    rows = []; prev = bytearray(stride); p = 0
    for _ in range(h):
        ft = raw[p]; p += 1; cur = bytearray(raw[p:p + stride]); p += stride
        if ft == 1:
            for i in range(bpp, stride): cur[i] = (cur[i] + cur[i - bpp]) & 255
        elif ft == 2:
            for i in range(stride): cur[i] = (cur[i] + prev[i]) & 255
        elif ft == 3:
            for i in range(stride):
                left = cur[i - bpp] if i >= bpp else 0
                cur[i] = (cur[i] + ((left + prev[i]) >> 1)) & 255
        elif ft == 4:
            for i in range(stride):
                a = cur[i - bpp] if i >= bpp else 0; b = prev[i]; c = prev[i - bpp] if i >= bpp else 0
                pa = abs(b - c); pb = abs(a - c); pc = abs(a + b - 2 * c)
                cur[i] = (cur[i] + (a if (pa <= pb and pa <= pc) else (b if pb <= pc else c))) & 255
        prev = cur; rows.append(bytes(cur))
    return w, h, ctype, bpp, rows


def chunk(typ, body):
    return struct.pack(">I", len(body)) + typ + body + struct.pack(">I", zlib.crc32(typ + body) & 0xffffffff)


def main():
    src, out = sys.argv[1], sys.argv[2]
    x, y, cw, ch = map(int, sys.argv[3:7])
    w, h, ctype, bpp, rows = decode(src)
    cw = min(cw, w - x); ch = min(ch, h - y)
    raw = b"".join(b"\x00" + rows[r][x * bpp:(x + cw) * bpp] for r in range(y, y + ch))
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", cw, ch, 8, ctype, 0, 0, 0)) \
        + chunk(b"IDAT", zlib.compress(raw, 6)) + chunk(b"IEND", b"")
    open(out, "wb").write(png)
    print(out, cw, ch)


if __name__ == "__main__":
    main()
