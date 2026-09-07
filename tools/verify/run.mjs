#!/usr/bin/env node
/**
 * 画素差分検証ハーネス。
 *
 *   node tools/verify/run.mjs --unit 01-header-fv [--no-build] [--port 4173] [--device pc|sp]
 *
 * 1. `next build`（--no-build で省略）
 * 2. out/ を静的配信
 * 3. Chromium（Playwright）で PC: 1920×DPR1 / SP: 375×DPR2（device 750）を開き、全画像の decode を待つ
 * 4. lib/page.json で unit に属する各切り出し要素を device px で撮影し、
 *    build/img/<dev>/<slice>.png（pdftocairo 72dpi の正解）と pixelmatch(threshold 0) で比較
 * 5. 隣接する切り出しの継ぎ目（±40px）を撮影し、正解画像の合成と比較
 * 6. 結果を docs/verify/<unit>/summary.json に記録。差分があれば .diff.png も保存
 *
 * 合格条件: すべての比較で差分画素 0（0.000%）。
 */
import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { execSync } from "node:child_process";

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const argv = process.argv.slice(2);
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const flag = (k) => argv.includes(`--${k}`);

const UNIT = opt("unit");
if (!UNIT) {
  console.error("usage: run.mjs --unit <unit> [--no-build] [--device pc|sp] [--port N]");
  process.exit(2);
}
const PORT = Number(opt("port", 4173));
const ONLY = opt("device");
const SEAM = 40; // CSS px above/below a boundary

const DEVICES = {
  pc: { viewport: { width: 1920, height: 1080 }, dsf: 1 },
  sp: { viewport: { width: 375, height: 812 }, dsf: 2 },
};

const pageSpec = JSON.parse(fs.readFileSync(path.join(ROOT, "lib/page.json"), "utf8"));
const sections = pageSpec.sections;
const unitSections = sections.filter((s) => s.unit === UNIT);
if (unitSections.length === 0) {
  console.error(`unit not found in lib/page.json: ${UNIT}`);
  process.exit(2);
}

// ---- helpers -------------------------------------------------------------
const MIME = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".ico": "image/x-icon", ".txt": "text/plain", ".svg": "image/svg+xml", ".woff2": "font/woff2" };

function serve(dir, port) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (p.endsWith("/")) p += "index.html";
      let file = path.join(dir, p);
      if (!fs.existsSync(file) && fs.existsSync(file + ".html")) file += ".html";
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(port, "127.0.0.1", () => resolve(srv));
  });
}

function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

function compare(actual, ref) {
  if (actual.width !== ref.width || actual.height !== ref.height) {
    return { ok: false, sizeMismatch: true, actual: [actual.width, actual.height], expected: [ref.width, ref.height], diff: null, total: ref.width * ref.height, pct: null };
  }
  const diffPng = new PNG({ width: ref.width, height: ref.height });
  const diff = pixelmatch(actual.data, ref.data, diffPng.data, ref.width, ref.height, { threshold: 0, includeAA: true });
  const total = ref.width * ref.height;
  return { ok: diff === 0, sizeMismatch: false, diff, total, pct: (diff / total) * 100, diffPng };
}

/** 2 枚の正解 PNG から、境界の上下 n 行ずつを縦に繋いだ合成を作る。 */
function seamReference(top, bottom, n) {
  const w = top.width;
  const out = new PNG({ width: w, height: n * 2 });
  top.data.copy(out.data, 0, (top.height - n) * w * 4, top.height * w * 4);
  bottom.data.copy(out.data, n * w * 4, 0, n * w * 4);
  return out;
}

function fmt(r) {
  if (r.sizeMismatch) return `SIZE ${r.actual.join("x")} != ${r.expected.join("x")}`;
  return `${r.diff}/${r.total} (${r.pct.toFixed(3)}%)`;
}

// ---- main ----------------------------------------------------------------
if (!flag("no-build")) {
  console.log("> next build");
  execSync("npx next build", { cwd: ROOT, stdio: "inherit" });
}

const outDir = path.join(ROOT, "out");
const server = await serve(outDir, PORT);
const url = `http://127.0.0.1:${PORT}/`;

const browser = await chromium.launch({ args: ["--force-color-profile=srgb", "--disable-lcd-text", "--hide-scrollbars"] });
const chromiumVersion = browser.version();

const commit = (() => {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();
  } catch {
    return null;
  }
})();

const summary = {
  unit: UNIT,
  date: new Date().toISOString(),
  commit,
  chromium: chromiumVersion,
  method: "pixelmatch threshold=0 includeAA=true; reference = build/img (pdftocairo -png -r 72, 1pt=1px; PC 1920px wide shown at CSS 1920 / DPR 1, SP 750px wide shown at CSS 375 / DPR 2); element screenshot scale=device",
  devices: {},
  pass: true,
};

const docDir = path.join(ROOT, "docs/verify", UNIT);
const actDir = path.join(ROOT, "build/verify", UNIT);
fs.mkdirSync(docDir, { recursive: true });

for (const dev of Object.keys(DEVICES)) {
  if (ONLY && ONLY !== dev) continue;
  const cfg = DEVICES[dev];
  const names = unitSections.flatMap((s) => s[dev]);
  // 直前ユニットの最後の切り出し（継ぎ目確認用）
  const firstIdx = sections.findIndex((s) => s.unit === UNIT);
  const prevNames = firstIdx > 0 ? sections[firstIdx - 1][dev] : [];
  const prevName = prevNames.length ? prevNames[prevNames.length - 1] : null;

  const ctx = await browser.newContext({ viewport: cfg.viewport, deviceScaleFactor: cfg.dsf, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    const imgs = [...document.images];
    await Promise.all(
      imgs.map((img) =>
        img.complete
          ? img.decode().catch(() => {})
          : new Promise((r) => {
              img.addEventListener("load", () => img.decode().then(r, r), { once: true });
              img.addEventListener("error", r, { once: true });
            }),
      ),
    );
  });
  const { scrollWidth, clientWidth, docHeight } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    docHeight: document.documentElement.scrollHeight,
  }));

  fs.mkdirSync(path.join(actDir, dev), { recursive: true });
  fs.mkdirSync(path.join(docDir, dev), { recursive: true });

  const result = { viewport: cfg.viewport, dsf: cfg.dsf, scrollWidth, clientWidth, docHeight, consoleErrors, slices: [], seams: [] };

  const boxes = {};
  const refs = {};
  for (const name of [prevName, ...names].filter(Boolean)) {
    const loc = page.locator(`[data-slice-${dev}="${name}"]`);
    if ((await loc.count()) !== 1) {
      result.slices.push({ name, ok: false, error: `element [data-slice-${dev}="${name}"] count=${await loc.count()}` });
      summary.pass = false;
      continue;
    }
    await loc.scrollIntoViewIfNeeded();
    const box = await loc.boundingBox();
    boxes[name] = box;
    refs[name] = readPng(path.join(ROOT, "build/img", dev, `${name}.png`));
    if (!names.includes(name)) continue; // prev slice: box only

    const buf = await loc.screenshot({ type: "png", scale: "device", animations: "disabled", caret: "hide" });
    fs.writeFileSync(path.join(actDir, dev, `${name}.png`), buf);
    const r = compare(PNG.sync.read(buf), refs[name]);
    const rec = {
      name,
      ok: r.ok,
      diff: r.diff,
      total: r.total,
      pct: r.pct === null ? null : Number(r.pct.toFixed(4)),
      sizeMismatch: r.sizeMismatch,
      actualSize: r.sizeMismatch ? r.actual : [refs[name].width, refs[name].height],
      box: { x: box.x, y: box.y, w: box.width, h: box.height },
      subpixel: [box.x, box.y, box.width, box.height].some((v) => Math.abs(v * cfg.dsf - Math.round(v * cfg.dsf)) > 1e-6),
    };
    const diffFile = path.join(docDir, dev, `${name}.diff.png`);
    if (!r.ok) {
      summary.pass = false;
      if (r.diffPng) fs.writeFileSync(diffFile, PNG.sync.write(r.diffPng));
    } else if (fs.existsSync(diffFile)) {
      fs.unlinkSync(diffFile);
    }
    result.slices.push(rec);
    console.log(`[${dev}] ${name.padEnd(28)} ${rec.ok ? "OK  " : "FAIL"} ${fmt(r)}${rec.subpixel ? "  (subpixel box!)" : ""}`);
  }

  // seams
  const chain = [prevName, ...names].filter((n) => n && boxes[n]);
  for (let i = 1; i < chain.length; i++) {
    const a = chain[i - 1];
    const b = chain[i];
    const y = boxes[b].y;
    const clip = { x: boxes[b].x, y: y - SEAM, width: boxes[b].width, height: SEAM * 2 };
    if (clip.y < 0) continue;
    const buf = await page.screenshot({ type: "png", fullPage: true, clip, scale: "device", animations: "disabled", caret: "hide" });
    const ref = seamReference(refs[a], refs[b], SEAM * cfg.dsf);
    const r = compare(PNG.sync.read(buf), ref);
    const rec = { between: [a, b], boundaryY: y, ok: r.ok, diff: r.diff, total: r.total, pct: r.pct === null ? null : Number(r.pct.toFixed(4)), sizeMismatch: r.sizeMismatch };
    const diffFile = path.join(docDir, dev, `seam_${a}__${b}.diff.png`);
    if (!r.ok) {
      summary.pass = false;
      if (r.diffPng) fs.writeFileSync(diffFile, PNG.sync.write(r.diffPng));
      fs.writeFileSync(path.join(actDir, dev, `seam_${a}__${b}.png`), buf);
    } else if (fs.existsSync(diffFile)) {
      fs.unlinkSync(diffFile);
    }
    result.seams.push(rec);
    console.log(`[${dev}] seam ${a} | ${b} ${rec.ok ? "OK  " : "FAIL"} ${fmt(r)}`);
  }

  if (scrollWidth > clientWidth) {
    summary.pass = false;
    console.log(`[${dev}] FAIL horizontal scroll: scrollWidth ${scrollWidth} > clientWidth ${clientWidth}`);
  }
  if (consoleErrors.length) {
    summary.pass = false;
    console.log(`[${dev}] FAIL console errors: ${consoleErrors.join(" | ")}`);
  }
  summary.devices[dev] = result;
  await ctx.close();
}

await browser.close();
server.close();

fs.writeFileSync(path.join(docDir, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(`\n${summary.pass ? "PASS" : "FAIL"}  -> ${path.relative(ROOT, path.join(docDir, "summary.json"))}`);
process.exit(summary.pass ? 0 : 1);
