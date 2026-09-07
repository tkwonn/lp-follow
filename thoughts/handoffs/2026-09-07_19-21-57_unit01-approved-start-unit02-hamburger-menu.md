---
date: 2026-09-07T19:21:57+09:00
git_commit: 8f7d548
branch: master
status: complete
---

# Handoff: 単位 01 承認（cairo 72dpi・PC 1x 確定）→ 単位 02 ハンバーガーメニューの実装へ

## タスク

FOLLOW LP を PDF デザインと画素差分 0.000% で再現する（正本 `CLAUDE.md`、計画 `thoughts/plans/2026-09-07_pixel-exact-implementation-plan.md`）。1 レビュー単位ごとに「実装 → `run.mjs` で差分 0 → Codex 独立検証 → 提出 → 承認」を回す。

- [完了・承認] 単位 00 基盤 + 単位 01 ヘッダー + FV。ユーザーは 2026-09-07 19:20 頃「次のセクションの実装に進んで」と指示（＝単位 01 承認）。
- [完了] 正解画像条件の確定。経緯: 旧 `pdftoppm -r 72` → ユーザー指摘（ハンバーガー真ん中の線だけ太い、フォント太さ、影が濃い）→ 原因分析（`docs/verify/01-header-fv/render-analysis.md`）→ 対策 A+B（cairo 144dpi・PC DPR 2）を実装・検証・提出（コミット `f9dc6ab`）→ ユーザー「見た目にあまり差がない。ハンバーガー修正だけ残して戻して」→ **最終: `pdftocairo -png -r 72`、PC 1920px を 1x・DPR 1、SP 750px を 2x・DPR 2**（コミット `8f7d548`）。
- [次] **単位 02 ハンバーガーメニュー**（計画 §5 #2）。
- [未着手] 単位 03〜19。

## 重要な参照資料

- `CLAUDE.md` — 正本。「再現度の基準」節が最終条件（cairo 72dpi、PC DPR 1）に更新済み。
- `docs/sections.md` 冒頭「共通：ヘッダー・ハンバーガーメニュー」表 — メニュー展開図の座標、9 項目の区切り線 y、閉じるボタン矩形、アンカー id 案。
- `thoughts/plans/2026-09-07_pixel-exact-implementation-plan.md` §3（ハンバーガーの 0.000% 成立方法）、§5（単位表）、§6（手順）。

## 最近の変更（コミット `f9dc6ab`, `8f7d548`）

- `tools/pdf_slice.py` — `pdftoppm` → `pdftocairo`。device 別倍率は `docs/slices.json` の `scale`（現在 PC 1 / SP 1）。`--scale=N` で上書き可。整数境界チェック追加。
- `docs/slices.json:5,68` — `"scale": 1` を pc/sp に追加。
- `lib/design.ts` — `Slice` に `scale` / `imgWidth` / `imgHeight`（PNG 実寸）を追加。`pct()` は `calc(100% * v / base)` をカスタムプロパティ `--hx/--hy/--hw/--hh` で返す。
- `app/globals.css:53-65` — `.hit` が `round(nearest, var(--h*), 0.0625px)` で 1/16px に丸め（フォールバックは丸めなし）。Chromium の % float32 切り捨てで基準幅に 1/64px の端数が出ていた Codex 指摘への対応。
- `components/Section.tsx` — `<img width/height>` に `imgWidth/imgHeight` を使用。
- `components/Menu.tsx:23-36` — `aria-controls="site-menu"` を削除（参照先が無いため。単位 02 でメニュー要素と共に付け直す）。
- `tools/verify/run.mjs:42-45,131` — PC DPR 1（戻し済み）、`method` 文字列更新。
- `tools/codex/verify-prompt.md:7-8,19-20` — 新条件、ハンバーガー等幅チェックを追加。
- `package.json` `images` スクリプト — `build/img` と `public/img` の両方へ書き出し（`--scale` 指定なし＝slices.json の scale）。
- ドキュメント: `CLAUDE.md:45-46`、計画書 §2/§4/§9、`docs/sections.md:3-5`、`docs/verify/01-header-fv/{render-analysis.md, codex-render-analysis.md, codex.md, codex-report.md, codex-independent.json, codex-line-width.json, crops/, crops-144dpi-trial/, summary.json}`。

## 学んだこと

- **ハンバーガー線幅の不揃いは poppler Splash の stroke adjust（ハードコード有効）が原因。** `pdftocairo` は AA で描くため 72dpi でも 3 本とも積分幅 1.98px で等幅（Codex 実測 504/255 px、39 列で厳密一致）。文字はインク被覆率 8.11% で Splash と同一、AA 分布だけ違う。ユーザーはこの差を許容。
- **PC 2x（144dpi）は視覚的な改善が小さく容量 3.5 倍（18MB → 64MB）でユーザーが不採用。** `docs/slices.json` の `scale` を 2 にすれば戻せる。影の差（PDF vs Figma 平均輝度差 −0.32）は未確定のまま、ユーザーから追加指摘なし。
- **pdftocairo の PNG は RGB・アルファなし・sRGB チャンク付き。** Chromium `--force-color-profile=srgb` で差分 0。
- **Chromium は % 長さを float32 で解決して 1/64px に切り捨てる。** `toFixed(4)` でも生の % でも SP 高さが 39.984375 になった。CSS `round()` で解決（Playwright Chromium 153 で確認）。
- Codex（`sh tools/codex/verify.sh <unit> > build/codex/log-<unit>.txt 2>&1`）は 1 回 15〜20 分。バックグラウンド実行し、完了通知後に `docs/verify/<unit>/codex.md` を読む。Codex は `docs/` を書き換えないので、詳細報告は `build/codex/report.md`（gitignore）から `docs/verify/<unit>/codex-report.md` にコピーする。Codex は実行前後でソースの SHA-256 を比較するので、並行して docs を編集すると「内容変化」として報告される（問題なし、注記すればよい）。
- 画像処理は `node_modules/sharp`（`build/probe/crop.mjs <in> <scale> <x> <y> <w> <h> <zoom> <out>`）。線幅測定は `build/probe/measure_ham.mjs`（現在 1x 用）。当たり判定矩形の実測は `build/probe/hitrect.mjs`（out/ を 4177 で配信して `getBoundingClientRect`）。

## 成果物

- コード: `tools/pdf_slice.py`, `lib/design.ts`, `components/{Section,HitArea,Menu}.tsx`, `app/globals.css`, `tools/verify/run.mjs`, `tools/codex/verify-prompt.md`, `package.json`
- 記録: `docs/verify/01-header-fv/summary.json`（最終条件、全 6 比較で 0 画素）、`codex.md`（合格・修正必須なし）、`render-analysis.md`（原因分析 + 144dpi 試行結果 + 最終決定）、`crops/pc-hamburger-cairo72-x8.png` ほか
- 画像: `build/img/{pc,sp}/`, `public/img/{pc,sp}/`（gitignore。`npm run images` で再生成。49 枚ずつ、PC 18MB / SP 10MB）
- 計画書・台帳: 上記「最近の変更」参照

## 次のステップ

1. **単位 02 ハンバーガーメニュー**を実装する。
   - 素材: `build/img/pc/PC-Menu_01_menu.png`（1920×1000）/ `build/img/sp/SP-Menu_01_menu.png`（750×1400）。ヘッダー（y 0–120）は共通なので y ≥ 120 部分を重ねる。方法は (a) `docs/slices.json` の PC-Menu / SP-Menu を `header`(0–120) + `menu`(120–) に分割して再切り出し（`lib/alt.json` に alt 追加が必要）、または (b) 画像を `top:-120px` 相当でずらして `overflow:hidden`。(a) が整数配置の確認が楽で推奨。
   - 構成: `components/Menu.tsx` に `MenuOverlay`（`id="site-menu"`、`role="dialog"` or ナビ、`aria-label`）を追加し `app/page.tsx` の `.lp` 内に置く。`MenuButton` に `aria-controls="site-menu"` を戻す。ヘッダーは静的（sticky にしない。CLAUDE.md 決定）なので、開いた状態はヘッダー直下 y=120 から展開図を絶対配置する（`position:absolute; top:120px`、基準幅で整数）。
   - 当たり判定: 閉じる `button` PC (1437,37,48,48) / SP (651,38,48,48)（`docs/sections.md`。ヘッダー内にあるので `MenuButton` と同位置の別ボタンか、開状態で `MenuButton` のラベルを切り替えるかを決める）。項目 9 件は `HitLink`（実在アンカー `#top #campaign #session #trial-flow #plan #instructor #facility #faq #access`。`#top` 以外はまだ id が無いので、`lib/page.json` の `id` として該当単位で作る。未作成のアンカーへの `a` は「リンク未設定」扱いにせず、id を先にプレースホルダー section で置くか、当該単位までは `aria-disabled` で明示するかを決めて記録する）。区切り線 y（PC 224…949、SP 259…1044）の間を各項目の矩形とする。
   - 挙動: Escape で閉じる、閉じた後にハンバーガーへフォーカス復帰、開いている間は背景スクロール抑止（`body{overflow:hidden}`。ただし撮影時に scrollbar が無いので差分に影響しないことを確認）、フォーカストラップ（最低限 Tab 順が閉じる→項目 1〜9 で循環）。
   - 検証: `run.mjs` に開状態撮影モードを追加（例 `--state menu-open`：ボタンをクリックし、viewport 1920×1000 / 375×700@2x で `#site-menu` を含むページ先頭 1000px / 1400 device px を撮影し `build/img/{pc,sp}/*Menu*` と比較）。閉じ直した後にヘッダー・FV が再び 0 差であることも比較する。summary は `docs/verify/02-menu/`。
   - Codex: `tools/codex/verify-prompt.md` にメニュー用チェック（開閉・Escape・フォーカス復帰・Tab 循環・背景スクロール・開状態の 0 差）を追記して `sh tools/codex/verify.sh 02-menu`。
   - 提出時に、アンカー先が未実装の項目の扱いと、SP メニューの縦スクロール要否（750×1400 = CSS 700px。viewport が低い端末では展開図がはみ出る）をユーザーに確認する。
2. 単位 03 以降: 前回ハンドオフ `thoughts/handoffs/2026-09-07_18-21-26_unit01-header-fv-pixel-exact-nextjs.md` の次のステップ 3〜5 を参照（`lib/page.json` に区画追加 → `lib/alt.json` → OVERLAYS に CTA → verify → Codex → 提出）。
3. トークン残量が総量の 20% 以下になったら単位途中でも `/create-handoff` → `/resume-handoff`。

## その他のメモ

- ユーザーに戻るのは「単位の提出」と「割り込み」のみ。それ以外は自律的に進める（`CLAUDE.md` 進行ルール）。コミットは単位ごとに Claude Code が行ってよい（これまでの運用）。
- 検証ポート: ハーネス既定 4173、Codex は 4199 / 4198、`hitrect.mjs` は 4177。`run.mjs --device pc|sp`、`--no-build` あり。
- `summary.json` の `commit` 欄は検証実行時の HEAD（コミット前）を指すため、提出コミットの 1 つ前になる。
- 影の濃さについてはユーザーから追加の指摘なし。再度指摘があれば具体箇所と表示環境（DPR・幅・ブラウザ）を確認する。
- 赤い注記ボックスの塗りは単位 14 / 17（PC-2 `2:4721` (1544,8051 265×98)、PC-3 `2:4735` (1501,5486 303×135)）。
