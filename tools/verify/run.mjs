#!/usr/bin/env node
/**
 * 画素差分検証ハーネス。
 *
 *   node tools/verify/run.mjs --unit 01-header-fv [--no-build] [--port 4173] [--device pc|sp]
 *   node tools/verify/run.mjs --unit 02-menu            （状態単位: STATE_UNITS。開状態の撮影と操作確認）
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

/**
 * 「状態」単位: ページの積み上げ（lib/page.json）ではなく、操作後の表示を撮影する単位。
 * 02-menu: ハンバーガーを開き、viewport 全体（PC 1920×1000 / SP 375×700@2x）が展開図と 0 差であること、
 * Escape・フォーカス復帰・Tab 循環・背景スクロール抑止、閉じ直した後にヘッダー・FV が再び 0 差であることを確認する。
 */
const STATE_UNITS = {
  "02-menu": {
    viewport: { pc: { width: 1920, height: 1000 }, sp: { width: 375, height: 700 } },
    slices: { pc: ["PC-Menu_01_menu"], sp: ["SP-Menu_01_menu"] },
    recheck: { pc: ["PC-1_01_header", "PC-1_02_fv"], sp: ["SP-1_01_header", "SP-1_02_fv"] },
    menuId: "site-menu",
    opener: '[aria-controls="site-menu"]',
    closer: "[data-menu-close]",
  },
};

const pageSpec = JSON.parse(fs.readFileSync(path.join(ROOT, "lib/page.json"), "utf8"));
const sections = pageSpec.sections;
const unitSections = sections.filter((s) => s.unit === UNIT);
const STATE = STATE_UNITS[UNIT] ?? null;
if (unitSections.length === 0 && !STATE) {
  console.error(`unit not found in lib/page.json or STATE_UNITS: ${UNIT}`);
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

/** 全画像の decode 完了を待つ（hidden な img も含む）。 */
async function waitImages(page) {
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
}

/** 表示中の要素だけを対象にした locator（PC 用と SP 用の当たり判定が両方 DOM にあるため）。 */
const visible = (page, sel) => page.locator(`${sel}:visible`);

/** 要素の矩形（CSS px）と、device px で整数かどうか。 */
async function rectOf(loc, dsf) {
  const b = await loc.boundingBox();
  const box = { x: b.x, y: b.y, w: b.width, h: b.height };
  const subpixel = [b.x, b.y, b.width, b.height].some((v) => Math.abs(v * dsf - Math.round(v * dsf)) > 1e-6);
  return { box, devicePx: [b.x, b.y, b.width, b.height].map((v) => Number((v * dsf).toFixed(4))), subpixel };
}

/** 切り出し要素を撮影して正解と比較し、記録を返す。 */
async function shootSlice(page, dev, cfg, name, actDirDev, docDirDev, suffix = "", { informational = false } = {}) {
  const loc = page.locator(`[data-slice-${dev}="${name}"]`);
  const ref = readPng(path.join(ROOT, "build/img", dev, `${name}.png`));
  const buf = await loc.screenshot({ type: "png", scale: "device", animations: "disabled", caret: "hide" });
  fs.writeFileSync(path.join(actDirDev, `${name}${suffix}.png`), buf);
  const r = compare(PNG.sync.read(buf), ref);
  const { box, subpixel } = await rectOf(loc, cfg.dsf);
  const rec = {
    name: `${name}${suffix}`,
    ok: r.ok,
    diff: r.diff,
    total: r.total,
    pct: r.pct === null ? null : Number(r.pct.toFixed(4)),
    sizeMismatch: r.sizeMismatch,
    actualSize: r.sizeMismatch ? r.actual : [ref.width, ref.height],
    box,
    subpixel,
  };
  // informational: 参考値（合否に含めない）。差分画像は .info.png に保存
  const diffFile = path.join(docDirDev, `${name}${suffix}${informational ? ".info" : ".diff"}.png`);
  if (!r.ok) {
    if (!informational) summary.pass = false;
    if (r.diffPng) fs.writeFileSync(diffFile, PNG.sync.write(r.diffPng));
  } else if (fs.existsSync(diffFile)) {
    fs.unlinkSync(diffFile);
  }
  if (informational) rec.informational = true;
  console.log(`[${dev}] ${rec.name.padEnd(28)} ${informational ? "INFO" : rec.ok ? "OK  " : "FAIL"} ${fmt(r)}${subpixel ? "  (subpixel box!)" : ""}`);
  return rec;
}

/** 状態単位（02-menu）の 1 device 分。 */
async function runStateUnit(dev, cfg) {
  const st = STATE;
  const viewport = st.viewport[dev];
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: cfg.dsf, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  await page.goto(url, { waitUntil: "networkidle" });
  await waitImages(page);

  const actDirDev = path.join(actDir, dev);
  const docDirDev = path.join(docDir, dev);
  fs.mkdirSync(actDirDev, { recursive: true });
  fs.mkdirSync(docDirDev, { recursive: true });

  const result = { viewport, dsf: cfg.dsf, consoleErrors, slices: [], viewportShots: [], hits: [], checks: [] };
  const check = (name, ok, detail) => {
    result.checks.push({ name, ok, ...(detail !== undefined ? { detail } : {}) });
    if (!ok) summary.pass = false;
    console.log(`[${dev}] check ${name.padEnd(36)} ${ok ? "OK  " : "FAIL"}${detail !== undefined ? " " + JSON.stringify(detail) : ""}`);
  };
  const menu = page.locator(`#${st.menuId}`);
  const opener = visible(page, st.opener);
  const closer = visible(page, `#${st.menuId} ${st.closer}`);
  const activeLabel = () => page.evaluate(() => (document.activeElement && document.activeElement.textContent) || null);

  // 閉状態: メニューは hidden、開くボタンは aria-expanded=false
  check("closed: menu hidden", await menu.isHidden());
  check("closed: opener aria-expanded=false", (await opener.getAttribute("aria-expanded")) === "false");
  check("closed: opener aria-controls resolves", (await page.locator(`#${st.menuId}`).count()) === 1);

  // マウスで開く
  await opener.click();
  await menu.waitFor({ state: "visible" });
  await waitImages(page);
  check("open: menu visible", await menu.isVisible());
  check("open: opener aria-expanded=true", (await opener.getAttribute("aria-expanded")) === "true");
  check("open: focus on close button", (await activeLabel()) === "メニューを閉じる", await activeLabel());
  check("open: main is inert", await page.evaluate(() => document.querySelector("main")?.hasAttribute("inert") === true));

  // 展開図要素と viewport 全体の撮影 → 正解と比較
  for (const name of st.slices[dev]) result.slices.push(await shootSlice(page, dev, cfg, name, actDirDev, docDirDev));
  {
    const name = st.slices[dev][0];
    const ref = readPng(path.join(ROOT, "build/img", dev, `${name}.png`));
    const buf = await page.screenshot({ type: "png", fullPage: false, scale: "device", animations: "disabled", caret: "hide" });
    fs.writeFileSync(path.join(actDirDev, `viewport-open.png`), buf);
    const r = compare(PNG.sync.read(buf), ref);
    const rec = { name: "viewport-open", ok: r.ok, diff: r.diff, total: r.total, pct: r.pct === null ? null : Number(r.pct.toFixed(4)), sizeMismatch: r.sizeMismatch, viewport, refSize: [ref.width, ref.height] };
    const diffFile = path.join(docDirDev, `viewport-open.diff.png`);
    if (!r.ok) {
      summary.pass = false;
      if (r.diffPng) fs.writeFileSync(diffFile, PNG.sync.write(r.diffPng));
    } else if (fs.existsSync(diffFile)) fs.unlinkSync(diffFile);
    result.viewportShots.push(rec);
    console.log(`[${dev}] ${"viewport-open".padEnd(28)} ${rec.ok ? "OK  " : "FAIL"} ${fmt(r)}`);
  }

  // 当たり判定の矩形（表示中のもの）
  const hits = page.locator(`#${st.menuId} .hit:visible`);
  const n = await hits.count();
  for (let i = 0; i < n; i++) {
    const h = hits.nth(i);
    const { box, devicePx, subpixel } = await rectOf(h, cfg.dsf);
    const rec = {
      tag: await h.evaluate((el) => el.tagName.toLowerCase()),
      label: (await h.textContent()) || "",
      href: await h.getAttribute("href"),
      ariaDisabled: await h.getAttribute("aria-disabled"),
      box,
      devicePx,
      subpixel,
    };
    if (subpixel) summary.pass = false;
    result.hits.push(rec);
  }
  check("open: hit count = 10 (close + 9 items)", n === 10, n);
  check("open: no subpixel hit rect", result.hits.every((h) => !h.subpixel));

  // 背景スクロール抑止（ホイール）
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(150);
  check("open: page not scrolled by wheel", (await page.evaluate(() => window.scrollY)) === 0, await page.evaluate(() => window.scrollY));
  check("open: no horizontal scroll", await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));

  // × をマウスで閉じる → ヘッダー・FV が再び 0 差（マウス操作だけの経路では :focus-visible のリングは出ない）
  // ※ キーボード操作（Tab / Escape）はこの後に行う。Chromium はキーボード操作後の script focus に :focus-visible を継承させるため、
  //    先に Escape を押すとマウス閉じ後の開くボタンにもリングが残り、ヘッダーに 972 px（PC）/ 2448 px（SP）の差が出る（2026-09-07 実測）。
  await closer.click();
  await menu.waitFor({ state: "hidden" });
  check("reclose(mouse): menu hidden", await menu.isHidden());
  check("reclose(mouse): opener aria-expanded=false", (await opener.getAttribute("aria-expanded")) === "false");
  check("reclose(mouse): focus returned to opener", await page.evaluate((sel) => document.activeElement === [...document.querySelectorAll(sel)].find((el) => getComputedStyle(el).display !== "none"), st.opener));
  check("reclose(mouse): main not inert", await page.evaluate(() => !document.querySelector("main")?.hasAttribute("inert")));
  check("reclose(mouse): html overflow restored", await page.evaluate(() => document.documentElement.style.overflow === "" && document.documentElement.style.paddingRight === ""));
  for (const name of st.recheck[dev]) result.slices.push(await shootSlice(page, dev, cfg, name, actDirDev, docDirDev, "@reclosed"));
  check("reclose(mouse): no horizontal scroll", await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));

  // もう一度マウスで開き、キーボード操作を確認する
  await opener.click();
  await menu.waitFor({ state: "visible" });
  check("reopen: focus on close button", (await activeLabel()) === "メニューを閉じる", await activeLabel());

  // Tab 循環: 閉じる → 項目 1..9 → 閉じる。Shift+Tab で戻る
  const order = [await activeLabel()];
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    order.push(await activeLabel());
  }
  check("open: Tab cycles close→items→close", order[0] === "メニューを閉じる" && order[10] === "メニューを閉じる" && new Set(order.slice(0, 10)).size === 10, order);
  await page.keyboard.press("Shift+Tab");
  check("open: Shift+Tab from close goes to last item", (await activeLabel()) === order[9], await activeLabel());
  await closer.focus();

  // Escape で閉じる → フォーカスは開くボタンへ（キーボード操作なので開くボタンにフォーカスリングが出る。これは期待どおりの挙動で、参考値として差分数を記録する）
  await page.keyboard.press("Escape");
  await menu.waitFor({ state: "hidden" });
  check("escape: menu hidden", await menu.isHidden());
  check("escape: opener aria-expanded=false", (await opener.getAttribute("aria-expanded")) === "false");
  check("escape: focus returned to opener", await page.evaluate((sel) => document.activeElement === [...document.querySelectorAll(sel)].find((el) => getComputedStyle(el).display !== "none"), st.opener));
  check("escape: main not inert", await page.evaluate(() => !document.querySelector("main")?.hasAttribute("inert")));
  check("escape: html overflow restored", await page.evaluate(() => document.documentElement.style.overflow === "" && document.documentElement.style.paddingRight === ""));
  check("escape: opener matches :focus-visible (ring expected)", await page.evaluate(() => !!document.activeElement && document.activeElement.matches(":focus-visible")));
  {
    const rec = await shootSlice(page, dev, cfg, st.recheck[dev][0], actDirDev, docDirDev, "@escaped-focus-ring", { informational: true });
    rec.note = "Escape（キーボード）で閉じた直後。開くボタンの :focus-visible リング（outline 3px + offset 2px）が写る。期待どおりの挙動で合否に含めない";
    result.slices.push(rec);
  }

  if (consoleErrors.length) {
    summary.pass = false;
    console.log(`[${dev}] FAIL console errors: ${consoleErrors.join(" | ")}`);
  }
  summary.devices[dev] = result;
  await ctx.close();
}

for (const dev of Object.keys(DEVICES)) {
  if (ONLY && ONLY !== dev) continue;
  const cfg = DEVICES[dev];
  if (STATE) {
    await runStateUnit(dev, cfg);
    continue;
  }
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
