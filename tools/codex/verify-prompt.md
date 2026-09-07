# 独立検証の依頼（ユニット {{UNIT}}）

あなたは FOLLOW LP（Next.js 静的書き出し）の**独立検証担当**です。実装担当（Claude Code）の報告を鵜呑みにせず、自分で再実行・再測定して合否を判定してください。ソース（`app/`, `components/`, `lib/`, `docs/`, `CLAUDE.md`）は**変更しないでください**。作業ファイルは `build/codex/` 配下にのみ作成できます。

## 前提

- 正解画像: `build/img/{pc,sp}/<slice>.png`（`design/*.pdf` を **pdftocairo** 72dpi で描画。1pt = 1px。PC 幅 1920px、SP 幅 750px。2026-09-07 改定。pdftoppm は使わない）。
- 合格条件: 正解と Chromium の撮影（device px）が **差分画素 0 個（0.000%）**。PC は viewport 幅 1920・DPR 1、SP は viewport 幅 375・DPR 2（device 750px）。詳細は `CLAUDE.md` の「再現度の基準」と `thoughts/plans/2026-09-07_pixel-exact-implementation-plan.md` §2。
- ページ構成: `lib/page.json`（unit = `{{UNIT}}` の区画が対象）。切り出し座標: `docs/slices.json`。当たり判定の座標: `docs/sections.md`。
- 実装担当の測定結果: `docs/verify/{{UNIT}}/summary.json`。実装側の撮影画像: `build/verify/{{UNIT}}/{pc,sp}/`。
- 既に `out/` にビルド済み。`node tools/verify/run.mjs --unit {{UNIT}} --no-build --port 4199` で再測定できます（Playwright と Chromium はインストール済み）。

## やること

1. `node tools/verify/run.mjs --unit {{UNIT}} --no-build --port 4199` を実行し、出力と `docs/verify/{{UNIT}}/summary.json` の数値が一致するか確認する（差分画素数・サイズ・subpixel フラグ・横スクロール・console error）。
2. 実装側の撮影画像と正解画像を **自分でも比較**する（Node の `pixelmatch`/`pngjs` は `node_modules` にあります。Python は標準ライブラリのみ）。summary.json の数値と食い違えば指摘する。
3. `build/codex/` に自分の Playwright スクリプトを書いて、`python3 -m http.server 4198 -d out` などで `out/` を配信し、次を確認する:
   - 幅 1920 / 1366 / 1024 / 768 / 767 / 375 / 320 で横スクロールが出ないこと（`scrollWidth <= clientWidth`）。
   - 幅 1920（DPR1）と 375（DPR2）で、対象区画の各切り出し要素の CSS 高さが `docs/slices.json` の高さ（PC はそのまま、SP は半分）と一致し、device px では正解 PNG の実寸（PC 1920 幅、SP 750 幅）と一致すること。
   - PC の正解 PNG の細線（ヘッダーのハンバーガー 3 本線）が等幅（各行の被覆を積分した幅が 3 本で同じ）であること、および実装の撮影でも等幅に写ること（pdftoppm 時代に真ん中だけ 3px で太かった不具合の再発確認）。
   - この単位に含まれる操作要素（当たり判定 `button`/`a`）が、意味のあるアクセシブルな名前を持ち、Tab で到達でき、フォーカス時に可視のアウトラインが出ること。`?debug=1` で矩形が可視化され、通常表示では見えないこと。
   - ヘッダーのハンバーガーは `aria-expanded` を切り替えること（メニュー展開図の重ね表示はユニット 02 で実装予定なので、開いても表示が変わらないのは既知）。
   - ページに console error / 404 が無いこと。
4. 結果を Markdown で報告する。構成: **判定（合格／不合格）**、再測定した数値の表（device / slice / diff / total / %）、summary.json との一致可否、上記チェックの結果、指摘事項（あれば再現手順付き）、改善提案（任意）。推測で書かず、実行した内容と観測した結果だけを書くこと。
