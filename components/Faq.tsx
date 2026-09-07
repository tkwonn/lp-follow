import type { CSSProperties } from "react";
import { PairedSlice } from "@/components/Section";
import { CtaButton } from "@/components/Cta";
import { ctasOf } from "@/lib/cta";
import { pct, slice, type Device, type SectionSpec } from "@/lib/design";
import faqData from "@/lib/faq.json";

/**
 * FAQ（単位 17）。CLAUDE.md の例外: **質問・回答の本文だけ実テキスト**（2026-09-07 ユーザー決定。0.000% の対象外）。
 *
 * - 見出し帯（faq-heading）と末尾の白（faq-tail）は通常の切り出し画像。
 * - 12 行はそれぞれ `details` / `summary`。Q 帯（上の白い隙間込み）と回答枠は PDF 切り出し画像で、文字の部分だけ
 *   帯色 #f1e7d4 / 白で塗ってある（tools/pdf_slice.py の "paint"）。その上に実テキストを PDF の行位置（lib/faq.json、
 *   tools/faq_layout.py が生成）へ絶対配置する。「Q」「A」の字・枠線・シェブロンは画像のまま。
 * - 初期状態は全閉（要確認）。複数同時に開ける。開くとシェブロンを上下反転する（帯画像の同じ範囲を `scaleY(-1)` で
 *   重ねるだけで、CSS で図形は描かない）。閉じた状態ではシェブロンの重ねは非表示なので Q 帯は画像そのまま。
 * - 各行の高さはデザイン値（画像の高さ）に固定。全部開くと Access 以降はデザインと同じ位置に来る。
 * - フォントは Web フォントで近似（Google Fonts を FAQ に出る文字だけのサブセットで取得し public/fonts に自己配信。
 *   tools/fetch_faq_fonts.sh、@font-face は app/globals.css）: 質問 筑紫AオールドMin R → Zen Old Mincho 400、
 *   回答 DNP秀英角ゴシック銀 M → Zen Kaku Gothic New 500。文字列を変えたら tools/faq_layout.py → fetch_faq_fonts.sh を再実行。
 */
type Rect = [number, number, number, number];
type Line = { text: string; x: number; cy: number };
type FaqRow = {
  id: string;
  q: { slice: string; height: number; band: [number, number]; text: string; x: number; cy: number; inkRect: Rect; paintRect: Rect; chevron: Rect };
  a: { slice: string; height: number; lines: Line[]; pitch: number | null; inkRect: Rect; paintRect: Rect; button?: { rect: Rect; label: string; ledger: string } };
};
type FaqDevice = {
  designWidth: number;
  qFont: { size: number; palt: boolean };
  aFont: { size: number; letterSpacing: number };
  aPitch: number;
  tail: string;
  rows: FaqRow[];
};
const FAQ = faqData as unknown as { pc: FaqDevice; sp: FaqDevice };

type Vars = Record<`--${string}`, string | number>;
const vars = (v: Vars) => v as CSSProperties;

/** 文字の左上（デザイン px）を切り出し画像に対する % 配置へ。行の高さは font-size と同じにし、上端 = 行中心 − size/2。 */
function textPos(x: number, cy: number, size: number, w: number, h: number): Vars {
  const p = pct([x, cy - size / 2, 0, 0], w, h);
  return { "--hx": p["--hx"], "--hy": p["--hy"], "--fs": size };
}

function QBand({ dev, row, meta }: { dev: Device; row: FaqRow; meta: FaqDevice }) {
  const s = slice(row.q.slice);
  const attrs = { [`data-slice-${dev}`]: s.name } as Record<string, string>;
  const [cx, cy, cw, ch] = row.q.chevron;
  return (
    <span className={`faq-dev ${dev}-only`} style={vars({ "--w": s.width })} {...attrs}>
      <img src={s.src} width={s.imgWidth} height={s.imgHeight} alt="" loading="lazy" decoding="sync" draggable={false} />
      <span className="faq-text faq-text--q" style={vars(textPos(row.q.x, row.q.cy, meta.qFont.size, s.width, s.height))}>
        {row.q.text}
      </span>
      {/* 開いたときだけ表示する、帯画像のシェブロン範囲の上下反転（画素は同じ画像から） */}
      <span className="faq-chev" aria-hidden="true" style={vars({ ...pct([cx, cy, cw, ch], s.width, s.height), "--cx": cx, "--cy": cy })}>
        <img src={s.src} width={s.imgWidth} height={s.imgHeight} alt="" loading="lazy" decoding="sync" draggable={false} />
      </span>
    </span>
  );
}

function ABox({ dev, row, meta }: { dev: Device; row: FaqRow; meta: FaqDevice }) {
  const s = slice(row.a.slice);
  const attrs = { [`data-slice-${dev}`]: s.name } as Record<string, string>;
  return (
    <div className={`faq-dev ${dev}-only`} style={vars({ "--w": s.width })} {...attrs}>
      <img src={s.src} width={s.imgWidth} height={s.imgHeight} alt="" loading="lazy" decoding="sync" draggable={false} />
      <p className="faq-a__text">
        {row.a.lines.map((l, i) => (
          <span key={i} className="faq-text faq-text--a" style={vars({ ...textPos(l.x, l.cy, meta.aFont.size, s.width, s.height), "--ls": meta.aFont.letterSpacing })}>
            {l.text}
          </span>
        ))}
      </p>
      {ctasOf(s.name).map((cta) => (
        <CtaButton key={cta.id} cta={cta} />
      ))}
    </div>
  );
}

function FaqItem({ pc, sp }: { pc: FaqRow; sp: FaqRow }) {
  return (
    <details className="faq-item" data-faq={pc.id}>
      <summary className="faq-q">
        <QBand dev="pc" row={pc} meta={FAQ.pc} />
        <QBand dev="sp" row={sp} meta={FAQ.sp} />
      </summary>
      <div className="faq-a">
        <ABox dev="pc" row={pc} meta={FAQ.pc} />
        <ABox dev="sp" row={sp} meta={FAQ.sp} />
      </div>
    </details>
  );
}

export default function Faq({ spec }: { spec: SectionSpec }) {
  const headPc = slice(spec.pc[0]);
  const headSp = slice(spec.sp[0]);
  const tailPc = slice(spec.pc[spec.pc.length - 1]);
  const tailSp = slice(spec.sp[spec.sp.length - 1]);
  if (FAQ.pc.rows.length !== FAQ.sp.rows.length) throw new Error("lib/faq.json: PC/SP row count mismatch");
  return (
    <section id={spec.id} data-section={spec.id} data-unit={spec.unit} className="faq">
      <PairedSlice pc={headPc} sp={headSp} eager={false} />
      <div className="faq-list">
        {FAQ.pc.rows.map((row, i) => (
          <FaqItem key={row.id} pc={row} sp={FAQ.sp.rows[i]} />
        ))}
      </div>
      <PairedSlice pc={tailPc} sp={tailSp} eager={false} />
    </section>
  );
}
