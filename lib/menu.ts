import { SECTIONS } from "@/lib/design";
import type { Rect } from "@/components/HitArea";

/**
 * ハンバーガーメニュー（単位 02）の台帳。座標はすべてデザイン px（docs/sections.md「共通：ヘッダー・ハンバーガーメニュー」）。
 *
 * - 展開図は PC-Menu `14:2`（1920×1000）/ SP-Menu `18:2`（750×1400）を y=0 から全面で重ねる。
 *   展開図のヘッダー部（y 0–120）は通常ヘッダーと同一ではない（PC はタグライン無し、ハンバーガーが × に置換。
 *   通常ヘッダーとの差分 PC 5,818 画素 / SP 7,690 画素。2026-09-07 実測）ため、y≥120 だけの重ねでは成立しない。
 * - 項目の矩形は区切り線 y の間。先頭項目の上端は「1 本目の区切り線 − 平均間隔」。
 */
export const MENU_SLICE = { pc: "PC-Menu_01_menu", sp: "SP-Menu_01_menu" } as const;

/** 閉じる（×）ボタン。PC `2:8116` / SP `2:8314`。 */
export const MENU_CLOSE_RECT: { pc: Rect; sp: Rect } = { pc: [1437, 37, 48, 48], sp: [651, 38, 48, 48] };

/** 展開図より下の未定義領域（PC 1000px / SP 1400px を超える viewport）の塗り。展開図左端の色（両 device とも RGB 209,193,162）。 */
export const MENU_FILL_BELOW = "#d1c1a2";

export type MenuItem = {
  en: string;
  ja: string;
  /** リンク先セクション id（lib/page.json の id）。該当単位で id が実装されるまでは「リンク未設定」で表示する。 */
  target: string;
  rect: { pc: Rect; sp: Rect };
};

// 区切り線 y（`2:8168`〜`2:8176` / `2:8366`〜`2:8374`）
const PC_SEP = [224, 315, 406, 496, 587, 678, 767, 860, 949];
const SP_SEP = [259, 357, 456, 553, 652, 750, 847, 947, 1044];
const PC_X: [number, number] = [598, 1132]; // 区切り線の x 範囲
const SP_X: [number, number] = [90, 668];
const PC_TOP = 133; // 224 − 91（平均間隔 90.6 → 91）
const SP_TOP = 161; // 259 − 98（平均間隔 98.1 → 98）

const LABELS: [en: string, ja: string, target: string][] = [
  ["Top", "トップ", "top"],
  ["Campaign", "キャンペーン", "campaign"],
  ["Personal session", "パーソナルセッション", "session"],
  ["Trial Flow", "体験の流れ", "trial-flow"],
  ["Personal Plan", "パーソナルプラン", "plan"],
  ["Instructor", "インストラクター紹介", "instructor"],
  ["Studio", "スタジオのご案内", "facility"],
  ["Faq", "よくあるご質問", "faq"],
  ["Access", "アクセスのご案内", "access"],
];

function rows(sep: number[], top: number, x: [number, number]): Rect[] {
  const out: Rect[] = [];
  let prev = top;
  for (const y of sep) {
    out.push([x[0], prev, x[1] - x[0], y - prev]);
    prev = y;
  }
  return out;
}

const PC_ROWS = rows(PC_SEP, PC_TOP, PC_X);
const SP_ROWS = rows(SP_SEP, SP_TOP, SP_X);

export const MENU_ITEMS: MenuItem[] = LABELS.map(([en, ja, target], i) => ({
  en,
  ja,
  target,
  rect: { pc: PC_ROWS[i], sp: SP_ROWS[i] },
}));

/** リンク先セクションが lib/page.json に実装済みか。 */
export function anchorExists(id: string): boolean {
  return SECTIONS.some((s) => s.id === id);
}
