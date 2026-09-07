import slicesSpec from "../docs/slices.json";
import pageSpec from "./page.json";

export type Device = "pc" | "sp";

export type Slice = {
  name: string; // <frame>_<nn>_<name>
  device: Device;
  frame: string;
  y0: number; // デザイン px（フレーム相対）
  y1: number;
  width: number; // デザイン px（PC 1920 / SP 750）。当たり判定の % 計算の基準
  height: number; // デザイン px
  scale: number; // 画像の倍率（PC 2 = 144dpi、SP 1 = 72dpi）
  imgWidth: number; // PNG の実寸 px（PC 3840 / SP 750）
  imgHeight: number;
  src: string; // /img/<device>/<name>.png
};

export const DESIGN_WIDTH: Record<Device, number> = { pc: 1920, sp: 750 };
/**
 * 表示幅（CSS px）。PC は 3840px 素材（144dpi）を 1920 CSS px に、SP は 750px 素材（72dpi）を 375 CSS px に、
 * いずれも 2x で表示する（2026-09-07 改定）。
 */
export const CSS_WIDTH: Record<Device, number> = { pc: 1920, sp: 375 };
export const BREAKPOINT = 768; // 768px 以上が PC

type SlicesSpec = {
  [K in Device]: {
    pdf: string;
    width: number;
    scale?: number;
    pages: { page: number; frame: string; height: number; slices: { name: string; y0: number; y1: number }[] }[];
  };
};

function buildIndex(): Record<string, Slice> {
  const spec = slicesSpec as unknown as SlicesSpec;
  const index: Record<string, Slice> = {};
  for (const device of ["pc", "sp"] as Device[]) {
    const scale = spec[device].scale ?? 1;
    for (const pg of spec[device].pages) {
      pg.slices.forEach((s, i) => {
        const name = `${pg.frame}_${String(i + 1).padStart(2, "0")}_${s.name}`;
        const height = Math.round(s.y1) - Math.round(s.y0);
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
          src: `/img/${device}/${name}.png`,
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

export type SectionSpec = { id: string; unit: string; pc: string[]; sp: string[] };
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
