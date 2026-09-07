import type { Rect } from "@/components/HitArea";

/**
 * CTA「体験セッションを予約する」の台帳（リンク先未設定。CLAUDE.md 2026-09-07 決定）。
 * 矩形は **切り出し画像内**のデザイン px（docs/sections.md「共通：CTA」のフレーム座標から切り出しの y0 を引いた値）。
 * 白い二重丸角ボタンの外側リングの外接矩形に一致する（2026-09-07 PNG 実測: PC x 1134–1529 / y 352–434、SP x 172–578 / y 516–598。±1px は線のアンチエイリアス）。
 * リンク先が確定したら components/Cta.tsx の `button` を `a` に差し替える。ダミー `href` は使わない。
 */
export type Cta = {
  id: string;
  slice: string;
  rect: Rect;
  /** アクセシブルな名前（画像内の文字列）。 */
  label: string;
  /** 台帳 ID（docs/sections.md） */
  ledger: string;
};

export const CTA_LABEL = "体験セッションを予約する";
export const FAQ_LINK_LABEL = "予約サイトはこちら";

export const CTAS: Cta[] = [
  // 単位 04 体験バナー: cta-pc-1 (1134, 2771, 394, 81) − y0 2418 / cta-sp-1 (172, 3195, 405, 81) − y0 2678
  { id: "trial-1", slice: "PC-1_06_trial-banner", rect: [1134, 353, 394, 81], label: CTA_LABEL, ledger: "cta-pc-1" },
  { id: "trial-1", slice: "SP-1_06_trial-banner", rect: [172, 517, 405, 81], label: CTA_LABEL, ledger: "cta-sp-1" },
  // 単位 10 末尾の体験バナー: cta-pc-2 (1144, 8592, 394, 81) − y0 8156 / cta-sp-2 は SP-2 (172, 576, 405, 81) を
  //   ページ境界をまたぐ切り出し SP-1_14_closing-trial-banner-2（SP-1 9002–9377 の 375px の下に SP-2 0–689 を連結）に載せるので y は 375 + 576
  //   （PNG 実測: PC x 1143–1537 / y 436–516、SP x 172–577 / y 950–1031）
  { id: "trial-2", slice: "PC-1_15_trial-banner-2", rect: [1144, 436, 394, 81], label: CTA_LABEL, ledger: "cta-pc-2" },
  { id: "trial-2", slice: "SP-1_14_closing-trial-banner-2", rect: [172, 951, 405, 81], label: CTA_LABEL, ledger: "cta-sp-2" },
  // 単位 11 体験フロー STEP01: cta-pc-3 PC-2 (515, 456, 394, 81) − y0 176 / cta-sp-3 SP-2 (92, 1045, 366, 81) − y0 847
  //   （PNG 実測: PC x 515–909 / y 279–360、SP x 92–458 / y 197–278）
  { id: "trial-3", slice: "PC-2_02_step01", rect: [515, 280, 394, 81], label: CTA_LABEL, ledger: "cta-pc-3" },
  { id: "trial-3", slice: "SP-2_03_step01", rect: [92, 198, 366, 81], label: CTA_LABEL, ledger: "cta-sp-3" },
  // 単位 17 FAQ 7「どうやって予約したら良いですか？」内の「予約サイトはこちら」（リンク先未定。link-pc-faq PC-3 (549, 7225, 212, 46) − 回答切り出し y0 7107 /
  //   link-sp-faq SP-4 (247, 2620, 254, 55) − y0 2375）。CTA と同じ扱い（透明な button、操作で「リンク未設定」を案内）
  { id: "faq-reserve", slice: "PC-3_22_faq-a07", rect: [549, 118, 212, 46], label: FAQ_LINK_LABEL, ledger: "link-pc-faq" },
  { id: "faq-reserve", slice: "SP-4_15_faq-a07", rect: [247, 245, 254, 55], label: FAQ_LINK_LABEL, ledger: "link-sp-faq" },
  // 単位 18 フッター黒帯（静的。固定・追従なし）: cta-pc-footer PC-3 (763, 9986, 394, 81) − y0 9948 / cta-sp-footer SP-4 (187, 5891, 377, 83) − y0 5845
  //   （PNG 実測: PC 白リング x 762–1157 / y 37–118、SP x 187–564 / y 46–129）
  { id: "footer", slice: "PC-3_37_footer-cta", rect: [763, 38, 394, 81], label: CTA_LABEL, ledger: "cta-pc-footer" },
  { id: "footer", slice: "SP-4_30_footer-cta", rect: [187, 46, 377, 83], label: CTA_LABEL, ledger: "cta-sp-footer" },
];

/** 切り出し名 → その画像に載る CTA。 */
export function ctasOf(sliceName: string): Cta[] {
  return CTAS.filter((c) => c.slice === sliceName);
}
