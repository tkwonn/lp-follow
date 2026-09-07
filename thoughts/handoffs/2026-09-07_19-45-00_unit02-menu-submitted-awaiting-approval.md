---
date: 2026-09-07T19:45:00+09:00
git_commit: 1006cc5
branch: master
status: complete
---

# Handoff: 単位 02 ハンバーガーメニュー 提出済み（承認待ち）→ Codex 再実行 → 単位 03 へ

## タスク

FOLLOW LP を PDF デザインと画素差分 0.000% で再現する（正本 `CLAUDE.md`、計画 `thoughts/plans/2026-09-07_pixel-exact-implementation-plan.md`）。1 レビュー単位ごとに「実装 → `run.mjs` で差分 0 → Codex 独立検証 → 提出 → 承認」を回す。

- [完了・承認] 単位 00 基盤 + 単位 01 ヘッダー + FV（前回ハンドオフ `thoughts/handoffs/2026-09-07_19-21-57_unit01-approved-start-unit02-hamburger-menu.md`）。
- [完了・提出済み・**承認待ち**] 単位 02 ハンバーガーメニュー（コミット `1006cc5`）。PC/SP とも開状態・閉じ直し後のすべてで差分 0 画素。19:43 頃にユーザーへ提出。ユーザーからは提出後に「なぜ `npm run serve` ではなく python でサーバを立ち上げているのか」という質問のみ（回答: 中身が同じコマンド。今後は `npm run serve` と書く）。**承認・確認事項への回答はまだ無い。**
- [作業中] 単位 02 の Codex 独立検証の**正式報告**。Codex は 19:40 に OpenAI 利用上限（`try again at 11:02 PM`）で報告を書く前に終了。独自検証の生データ（134 項目）は取得済み。**23:06 JST に再実行するセッション内 cron（一回限り）を登録済み**だが、セッションを終えると消えるので手動で再実行が必要。
- [未着手] 単位 03〜19。

## 重要な参照資料

- `CLAUDE.md` — 正本。「再現度の基準」節にハンバーガーの全面重ね・`#d1c1a2` 塗り例外（承認待ち）を追記済み。
- `docs/sections.md` 「共通：ヘッダー・ハンバーガーメニュー」＋「単位 02 実装記録」 — 座標・決定・要確認事項。
- `docs/verify/02-menu/notes.md` — 単位 02 の条件・数値・基準外 viewport の見え方・要確認 3 件。`checklist.md` は Codex 用の単位固有チェック。

## 最近の変更（コミット `1006cc5`）

- `lib/menu.ts`（新規）— メニュー台帳。`MENU_SLICE`、`MENU_CLOSE_RECT`（PC 1437,37,48,48 / SP 651,38,48,48）、`MENU_ITEMS`（9 件、区切り線間の矩形、`target` id）、`MENU_FILL_BELOW = "#d1c1a2"`、`anchorExists()`。
- `components/Menu.tsx` — `MenuProvider`/`useMenu` 継続。追加: `LpMain`（`main.lp` を展開中 `inert`）、`MenuOverlay`（`#site-menu`、`role="dialog"`、`aria-modal`、`hidden={!open}`、常に DOM に置き eager 読み込み）、フォーカス管理（開いたら × へ、閉じたら opener へ）、Escape、Tab 循環、`html.style.overflow=hidden` + スクロールバー幅の `padding-right` 補正。`MenuButton` に `aria-controls="site-menu"` を戻し、ラベルは常に「メニューを開く」。
- `components/Section.tsx:34-35` — `PairedSlice` を export（メニュー展開図で再利用）。
- `app/page.tsx` — `LpMain` で main を包み、`<MenuOverlay />` を main の兄弟として配置。
- `app/globals.css:87-112` — `.menu-layer`（`position: fixed; inset: 0; z-index: 10; overflow-y: auto; overscroll-behavior: contain; background: #fff`）、`.menu-layer[hidden]{display:none}`、`.menu-layer__inner`（`max-width: 1920px; margin: 0 auto; min-height: 100%; background: #d1c1a2`）。
- `lib/alt.json` — `PC-Menu_01_menu` / `SP-Menu_01_menu` の alt 追加。
- `lib/page.json` — comment にメニューのリンク先 id 一覧（top / campaign / session / trial-flow / plan / instructor / facility / faq / access）を追記。
- `tools/verify/run.mjs` — `STATE_UNITS["02-menu"]`（viewport PC 1920×1000 / SP 375×700、撮影対象、recheck、セレクタ）、`waitImages`/`visible`/`rectOf`/`shootSlice(... {informational})`/`runStateUnit` を追加。`unitSections` が空でも `STATE` があれば動く。
- `tools/codex/verify-prompt.md` — 状態単位の説明、`docs/verify/{{UNIT}}/checklist.md` を必ず読む指示、ハンバーガーの記述更新。
- ドキュメント: `CLAUDE.md`（例外追記）、`docs/sections.md`、計画書 §3 表、`docs/verify/02-menu/{summary.json, notes.md, checklist.md, codex.md（暫定）, codex-independent.json, codex-independent.mjs, crops/*.png, crops/views.json, pc|sp/*@escaped-focus-ring.info.png}`、`docs/verify/01-header-fv/summary.json`（回帰再実行で日付更新のみ）。

## 学んだこと

- **メニュー展開図のヘッダー部（y 0–120）は通常ヘッダーと同一ではない。** PC はタグライン無し・ハンバーガーが × に置換（差分 5,818 画素、x 0–1498 / y 34–119）、SP も × 置換（7,690 画素）。前回ハンドオフの「y≥120 だけ重ねる」案は不成立。展開図を y=0 から全面で `position: fixed` に重ねる方式で 0 差になった。
- **Chromium の `:focus-visible` はキーボード操作後の script focus に継承される。** 検証手順で Escape（キーボード）を先に行うと、その後マウスで閉じても opener にリングが残りヘッダー差分 PC 972 / SP 2,448 画素が出る。`run.mjs` は「マウス開閉→再比較」を先に、キーボード操作を後に並べてある（`tools/verify/run.mjs` の runStateUnit 内コメント参照）。Escape 後のリング付き撮影は `informational: true` で `.info.png` に保存し合否に含めない。
- 基準外 viewport: PC 1920×1080 では展開図の下 80px が `#d1c1a2` の平坦塗りになり右側の写真との境目が見える（`docs/verify/02-menu/crops/pc-1920x1080-open.png`）。ユーザー確認事項。
- Codex（gpt-6-astra）の利用上限に当たると `-o` の報告ファイルが作られず exit 1。生データは `build/codex/<unit>/` に残るので `docs/verify/<unit>/` にコピーして暫定記録にした。ログの `ERROR: You've hit your usage limit` で判別。
- Codex の独自スクリプトの NG 5 件は実装の問題ではない: `outline.includes('2px dashed')`（Chromium は `dashed 2px` の順で返す）と、線端込み総被覆量の厳密等号比較（単位 01 で「対応不要」と結論済み）。詳細は `docs/verify/02-menu/codex.md`。
- `npm run serve` = `python3 -m http.server 8080 -d out`。ユーザーへの案内は `npm run serve` で書く。
- 画像処理の補助: `build/probe/hdrcmp.mjs`（ヘッダー vs 展開図の差分）、`build/probe/diffbbox.mjs <diff.png>`（差分画像の bbox）、`build/probe/menu_views.mjs`（基準外 viewport の開状態撮影、ポート 4178）。いずれも gitignore。

## 成果物

- コード: `lib/menu.ts`, `components/Menu.tsx`, `components/Section.tsx`, `app/page.tsx`, `app/globals.css`, `lib/alt.json`, `lib/page.json`, `tools/verify/run.mjs`, `tools/codex/verify-prompt.md`
- 記録: `docs/verify/02-menu/summary.json`（PASS、全 8 比較 0 画素、checks 全 OK、hits 10 個の devicePx）、`notes.md`、`checklist.md`、`codex.md`（暫定）、`codex-independent.{json,mjs}`、`crops/`
- 文書: `CLAUDE.md`、`docs/sections.md`、計画書 §3

## 次のステップ

1. **ユーザーの承認を待つ／確認事項の回答を反映する**（提出メッセージの 3 件）:
   - 基準より高い viewport で展開図の下を `#d1c1a2` で埋める扱い（代案: 白／別色）。変更は `app/globals.css` の `.menu-layer__inner` 背景と `lib/menu.ts` `MENU_FILL_BELOW`、`CLAUDE.md`・`docs/sections.md`・`notes.md` の記述。
   - SP 高さ 700px 未満での層内スクロール（現状維持で問題なければそのまま）。
   - 「Top」のリンク先 `#top`（FV）か `#header`（ページ最上部）か。変更は `lib/menu.ts` の LABELS と `docs/sections.md` の表。
2. **Codex 正式報告の取得**（23:02 JST 以降）: `sh tools/codex/verify.sh 02-menu > build/codex/log-02-menu-2.txt 2>&1` をバックグラウンドで実行（15〜20 分）。完了後 `docs/verify/02-menu/codex.md` が正式報告で上書きされるので、暫定版の分析（判定バグ 2 件・線端被覆の既知事項）を注記として末尾に追記し、`build/codex/report.md` があれば `codex-report.md` にコピーしてコミット。再度 usage limit なら記録して待つ。Codex の NG 判定が実装の問題なら修正して `run.mjs --unit 02-menu` から再実行。
3. 承認後、**単位 03 Point 01–03**（計画 §5 #3）: `lib/page.json` に `{ id: "point01", unit: "03-points", pc: ["PC-1_03_point01"], sp: ["SP-1_03_point01"] }` 等を追加（id は任意だがメニューの target とは無関係）→ `lib/alt.json` に alt（文字列は `docs/pdf-text/PC-1.lines.txt` / `SP-1.lines.txt` から）→ `node tools/verify/run.mjs --unit 03-points` で 0 差 → Codex → 提出。この単位に当たり判定は無い。以降の単位でメニューの target id（campaign 等）を持つセクションを追加すると、メニュー項目が自動で `a` になるので `run.mjs --unit 02-menu` を再実行して checks（hit の tag/href）が変わることを記録する。
4. トークン残量が総量の 20% 以下になったら単位途中でも `/create-handoff` → `/resume-handoff`。

## その他のメモ

- ユーザーに戻るのは「単位の提出」と「割り込み」のみ。それ以外は自律的に進める（`CLAUDE.md` 進行ルール）。コミットは単位ごとに Claude Code が行う。
- 検証ポート: ハーネス既定 4173（単位 01 回帰は 4174 を使った）、Codex は 4199 / 4198、`hitrect.mjs` 4177、`menu_views.mjs` 4178。
- `summary.json` の `commit` 欄は検証実行時の HEAD（コミット前 `d7c18b0`）を指す。
- 単位 02 の基準 viewport は PC 1920×1000 / SP 375×700@2x（他単位の 1080 / 812 と異なる）。`run.mjs` の `STATE_UNITS` に定義。
- Section id `top` は FV（y=120〜）。`header` は y 0–120。
- 赤い注記ボックスの塗りは単位 14 / 17（PC-2 `2:4721` (1544,8051 265×98)、PC-3 `2:4735` (1501,5486 303×135)）。
