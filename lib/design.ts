import slicesSpec from "../docs/slices.json";
import pageSpec from "./page.json";

export type Device = "pc" | "sp";

export type Slice = {
  name: string; // <frame>_<nn>_<name>
  device: Device;
  frame: string;
  y0: number;
  y1: number;
  width: number;
  height: number;
  src: string; // /img/<device>/<name>.png
};

export const DESIGN_WIDTH: Record<Device, number> = { pc: 1920, sp: 750 };
/** SP は 750px 素材を 375 CSS px（DPR 2）で表示する。 */
export const CSS_WIDTH: Record<Device, number> = { pc: 1920, sp: 375 };
export const BREAKPOINT = 768; // 768px 以上が PC

type SlicesSpec = {
  [K in Device]: {
    pdf: string;
    width: number;
    pages: { page: number; frame: string; height: number; slices: { name: string; y0: number; y1: number }[] }[];
  };
};

function buildIndex(): Record<string, Slice> {
  const spec = slicesSpec as unknown as SlicesSpec;
  const index: Record<string, Slice> = {};
  for (const device of ["pc", "sp"] as Device[]) {
    for (const pg of spec[device].pages) {
      pg.slices.forEach((s, i) => {
        const name = `${pg.frame}_${String(i + 1).padStart(2, "0")}_${s.name}`;
        index[name] = {
          name,
          device,
          frame: pg.frame,
          y0: s.y0,
          y1: s.y1,
          width: spec[device].width,
          height: Math.round(s.y1) - Math.round(s.y0),
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

/** 矩形（デザイン px）を、幅 w・高さ h の親に対する % 配置へ変換する。 */
export function pct(rect: [number, number, number, number], w: number, h: number) {
  const [x, y, rw, rh] = rect;
  const f = (v: number, base: number) => `${((v / base) * 100).toFixed(4)}%`;
  return { left: f(x, w), top: f(y, h), width: f(rw, w), height: f(rh, h) };
}
