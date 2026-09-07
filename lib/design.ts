import slicesSpec from "./slices.json";
import pageSpec from "./page.json";

export type Device = "pc" | "sp";

export type Slice = {
  name: string; // <frame>_<nn>_<name>
  device: Device;
  frame: string;
  y0: number; // デザイン px（フレーム相対）
  y1: number; // 自ページ内の下端。extendIntoNext 付きの切り出しは height に次ページ分が加わる（height ≠ y1 − y0）
  width: number; // デザイン px（PC 1920 / SP 750）。当たり判定の % 計算の基準
  height: number; // デザイン px
  scale: number; // 画像の倍率（docs/slices.json の scale。1 = 72dpi、2 = 144dpi。現在 PC 1 / SP 1）
  imgWidth: number; // PNG の実寸 px（PC 1920 / SP 750）
  imgHeight: number;
  src: string; // /img/<device>/<name>.png または .svg
};

export const DESIGN_WIDTH: Record<Device, number> = { pc: 1920, sp: 750 };
/**
 * 表示幅（CSS px）。PC は 1920px 素材を 1920 CSS px に 1x で、SP は 750px 素材を 375 CSS px に 2x で表示する。
 * （PC 144dpi・2x 案は 2026-09-07 に試行後、ユーザー指示で 1x に戻した。）
 */
export const CSS_WIDTH: Record<Device, number> = { pc: 1920, sp: 375 };
export const BREAKPOINT = 768; // 768px 以上が PC

type SlicesSpec = {
  [K in Device]: {
    pdf: string;
    width: number;
    scale?: number;
    pages: {
      page: number;
      frame: string;
      height: number;
      /** extendIntoNext: 次ページの先頭 N px を連結した 1 枚（ページ境界をまたぐ切り出し）。mergedIntoPrev: 前ページの最後の切り出しに含まれる（PNG 無し）。 */
      slices: { name: string; y0: number; y1: number; extendIntoNext?: number; mergedIntoPrev?: boolean }[];
    }[];
  };
};

// Personal Plan は比較で確認した、元 PDF の文字・枠線を保持する SVG を使用。
const SVG_SLICES = new Set(["PC-2_16_plans", "SP-2_17_plans"]);

// 初期表示付近とメニューは可逆 WebP。PNG とデコード後の RGBA が一致することを変換時に検証する。
const WEBP_SLICES = new Set([
  "PC-1_02_fv",
  "PC-1_03_point01",
  "PC-1_04_point02",
  "PC-1_05_point03",
  "PC-Menu_01_menu",
  "SP-1_02_fv",
  "SP-1_03_point01",
  "SP-1_04_point02",
  "SP-1_05_point03",
  "SP-Menu_01_menu",
]);

function extensionOf(name: string): "svg" | "webp" | "png" {
  if (SVG_SLICES.has(name)) return "svg";
  if (WEBP_SLICES.has(name)) return "webp";
  return "png";
}

function buildIndex(): Record<string, Slice> {
  const spec = slicesSpec as unknown as SlicesSpec;
  const index: Record<string, Slice> = {};
  for (const device of ["pc", "sp"] as Device[]) {
    const scale = spec[device].scale ?? 1;
    for (const pg of spec[device].pages) {
      pg.slices.forEach((s, i) => {
        // ページ境界をまたぐ切り出し（単位 10、SP-1/SP-2）: 前ページの最後の切り出しが次ページ先頭 extendIntoNext px を含む。
        // 次ページ側の mergedIntoPrev は番号付けのためだけに残っていて PNG が無いので索引に載せない。
        if (s.mergedIntoPrev) return;
        const name = `${pg.frame}_${String(i + 1).padStart(2, "0")}_${s.name}`;
        const height = Math.round(s.y1) - Math.round(s.y0) + (s.extendIntoNext ?? 0);
        index[name] = {
          name,
          device,
          frame: pg.frame,
          y0: s.y0,
          y1: s.y1,
          width: spec[device].width,
          height,
          scale,
          imgWidth: spec[device].width * scale,
          imgHeight: height * scale,
          src: `/img/${device}/${name}.${extensionOf(name)}`,
        };
      });
    }
  }
  return index;
}

export const SLICES: Record<string, Slice> = buildIndex();

export function slice(name: string): Slice {
  const s = SLICES[name];
  if (!s) throw new Error(`unknown slice: ${name}`);
  return s;
}

/** component: 画像の積み上げ以外の描き方をする区画（"faq" = components/Faq.tsx。単位 17）。省略時は components/Section.tsx。 */
export type SectionSpec = { id: string; unit: string; pc: string[]; sp: string[]; component?: "faq" };
export const SECTIONS: SectionSpec[] = (pageSpec as { sections: SectionSpec[] }).sections;

/**
 * 矩形（デザイン px）を、幅 w・高さ h の親に対する % 配置へ変換する。
 * 値はカスタムプロパティ `--hx/--hy/--hw/--hh` に入れ、`.hit`（app/globals.css）が
 * `round(nearest, var(..), 0.0625px)` で 1/16 px に丸めて使う（フォールバックは丸めなし）。
 * 理由: Chromium は % を float32 で解決して 1/64 px に切り捨てるため、`toFixed(4)` や生の % では
 * 基準幅で 75.984375 / 39.984375 のような端数が出る（Codex 指摘 2026-09-07）。
 */
export function pct(rect: [number, number, number, number], w: number, h: number) {
  const [x, y, rw, rh] = rect;
  const f = (v: number, base: number) => `calc(100% * ${v} / ${base})`;
  return { "--hx": f(x, w), "--hy": f(y, h), "--hw": f(rw, w), "--hh": f(rh, h) } as Record<`--${string}`, string>;
}
