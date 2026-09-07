---
date: 2026-09-07T20:05:43+09:00
git_commit: 064f21e
branch: master
status: complete
---

# Handoff: 単位 03 Point 01–03 提出済み（承認待ち）→ Codex 再実行（02・03）→ 単位 04 へ

## タスク

FOLLOW LP を PDF デザインと画素差分 0.000% で再現する（正本 `CLAUDE.md`、計画 `thoughts/plans/2026-09-07_pixel-exact-implementation-plan.md` §5 の単位表）。1 単位ごとに「実装 → `run.mjs` で差分 0 → Codex 独立検証 → 提出 → 承認」を回す。

- [完了・承認] 単位 00 基盤、01 ヘッダー + FV。
- [完了・提出済み] 単位 02 ハンバーガーメニュー（`1006cc5`）。ユーザーは「次のセクションの実装に進んで」と指示（19:47）→ 承認扱いで進行。提出時の確認事項 3 件（下記）は未回答のため現状維持。
- [完了・提出済み・**承認待ち**] 単位 03 Point 01–03（`064f21e`、20:03 提出）。PC/SP 全 6 切り出し・継ぎ目 6 箇所とも 0 画素。単位 01・02 の回帰 PASS。
- [作業中・ブロック中] 単位 02・03 の **Codex 独立検証の正式報告**。OpenAI 利用上限（`try again at 11:02 PM`）で 2 回とも起動直後に終了。**23:02 JST 以降に再実行**。
- [未着手] 単位 04〜19。

## 重要な参照資料

- `CLAUDE.md` — 正本。進行ルール、0.000% 基準、単位 03 で追記した「SP 切り出しは累積 device y が全境界で偶数」ルール。
- `docs/sections.md` — セクション台帳。「単位 02 実装記録」「単位 03 実装記録（SP 切り出し境界の偶数化）」に決定事項・未解決事項。
- `docs/verify/03-points/notes.md`（条件・数値・残課題）、`checklist.md`（Codex 用の単位固有項目）、`codex.md`（未実施の記録と再実行手順）。

## 最近の変更（コミット `064f21e`）

- `lib/page.json` — 区画 `points`（unit `03-points`、PC `PC-1_03_point01`/`_04_point02`/`_05_point03`、SP 同名 3 枚）を `top` の次に追加。id は menu の target ではない。
- `lib/alt.json` — 6 枚の alt（PDF 本文。SP 1 行目は「徒歩1分の」で PC と異なる原文どおり）。
- `docs/slices.json` — SP 奇数境界を修正: SP-1 1745→1746、4373→4372、9003→9002。SP-2 5298→5297、6262→6261。SP-3 5983→5982、6841→6840、7535→7534。SP-4 250→251。`"dpr": 1/2` を pc/sp に追加、Menu ページに `"standalone": true`。
- `tools/pdf_slice.py:36-56` — `dpr` 整列チェック（ページ累積 device y と高さが dpr の倍数か）。`standalone` ページは累積に含めない。警告は `! ... not aligned to dpr` / `starts at cumulative ...`。
- `tools/verify/run.mjs:410-415` — 切り出し要素の `boundingBox()`（viewport 相対）に `window.scrollX/Y` を足してページ相対に。継ぎ目の fullPage clip と summary の `box` が viewport 外の区画でも正しくなった。
- `build/img/sp/*` と `public/img/sp/*` を再生成（`python3 tools/pdf_slice.py docs/slices.json --only=sp --out=<dir>` を両方に実行、`cmp` で全一致確認）。
- `CLAUDE.md:48` に偶数ルール追記。`docs/sections.md` の SP 表 y 範囲を新境界に更新 + 単位 03 実装記録。`docs/verify/03-points/{summary.json,notes.md,checklist.md,codex.md}` 新規。`docs/verify/01-header-fv/summary.json`・`02-menu/summary.json` は回帰再実行で date/commit/docHeight のみ更新。

## 学んだこと

- **SP 切り出し高さが奇数だと 0 差にならない。** SP は 750px 素材を CSS 375px（DPR 2）に表示するので、高さ 425px は CSS 212.5px → Chromium が 213px（426 device px）に丸めて拡縮（差分 45%）。正しい条件は「ページ累積の device y がすべての境界で偶数」。SP-2 は累積開始 9377（奇数）なのでページ相対境界は**奇数**が正しい。SP-4 も同様（累積開始 27287）。
- **ページ境界 SP-1/SP-2（累積 9377）・SP-3/SP-4（累積 27287）は偶数にできない**（PDF ページ高さが奇数）。単位 10（closing + trial-banner-2）と単位 17（hammock 末尾 + faq-heading）で **2 ページの描画を縦に連結した 1 枚の切り出し**が必要。`pdf_slice.py` は現在 `pdftocairo -x 0 -y y0 -W w -H h` で 1 ページのみ切るので連結対応を入れる（PIL はこの Mac に無い。pngjs か pdftocairo 出力を Python で連結）。最終スライス `footer-cta`（173px、文書末端）は後続がないので許容見込み（単位 18 で確認）。
- **`run.mjs` の継ぎ目撮影は viewport 外で壊れていた**（単位 01・02 は viewport 内で発覚せず）。修正済み。今後の単位は全部 viewport 外なのでこの修正が前提。
- **`npm run images` は `build/img` と `public/img` の両方を生成する。** `--out=build/img` だけ再生成すると `out/` に旧画像が入り、正解は新・実装は旧で差分が出る。片方だけ変えたら必ず両方へ。
- Codex 利用上限中は `-o` の報告ファイルが作られず exit 1、`build/codex/log-<unit>.txt` に `You've hit your usage limit`。
- 回帰再実行のポート: 01 は 4174、02 は 4175（既定 4173 は unit 実行中に使用）。

## 成果物

- コード: `lib/page.json`, `lib/alt.json`, `docs/slices.json`, `tools/pdf_slice.py`, `tools/verify/run.mjs`
- 記録: `docs/verify/03-points/summary.json`（PASS、slices 6 + seams 6 すべて diff 0、subpixel false、scrollWidth = clientWidth、consoleErrors 0、docHeight PC 2418 / SP 1339）、`notes.md`、`checklist.md`、`codex.md`
- 文書: `CLAUDE.md`、`docs/sections.md`
- ログ: `build/run-03.txt`、`build/run-01-regress.txt`、`build/run-02-regress.txt`、`build/codex/log-03-points.txt`（gitignore）

## 次のステップ

1. **ユーザーの承認を待つ**（単位 03）。単位 02 の確認事項 3 件は未回答のまま現状維持: 高い viewport で展開図の下を `#d1c1a2` で埋める／SP 700px 未満で層内スクロール／「Top」は `#top`（FV）。
2. **23:02 JST 以降に Codex を 2 単位分実行**（各 15〜20 分、バックグラウンドでファイルに落とす）:
   ```
   sh tools/codex/verify.sh 02-menu   > build/codex/log-02-menu-2.txt 2>&1
   sh tools/codex/verify.sh 03-points > build/codex/log-03-points-2.txt 2>&1
   ```
   完了後 `docs/verify/<unit>/codex.md` が正式報告で上書きされる。02 は暫定版の分析（判定バグ 2 件・線端被覆の既知事項、前ハンドオフ参照）を末尾に注記として残す。`build/codex/report.md` があれば `codex-report.md` にコピーしてコミット。NG が実装の問題なら修正して `run.mjs` から再実行。
3. 承認後、**単位 04 体験バナー（CTA 1）**（計画 §5 #4）: `lib/page.json` に `{ id: "trial-banner", unit: "04-trial-banner", pc: ["PC-1_06_trial-banner"], sp: ["SP-1_06_trial-banner"] }`（PC 2418–2997、SP 2678–3306。両方偶数境界済み）→ alt → CTA 当たり判定を `app/page.tsx` の `OVERLAYS` に追加（矩形は `docs/sections.md` 「共通：CTA」節の cta-pc-1 / cta-sp-1。透明 `button`、名前に「リンク未設定」、`?debug=1` で可視化、`href` ダミー禁止）→ `run.mjs --unit 04-trial-banner` で 0 差 → `run.mjs --unit 02-menu --no-build` 回帰 → Codex → 提出。
4. 単位 05 で `campaign` id が追加されるとメニュー項目「Campaign」が自動で `a` になる。`run.mjs --unit 02-menu` の checks（hit の tag/href）が変わるので記録する。
5. トークン残量が総量の 20% 以下になったら単位途中でも `/create-handoff` → `/resume-handoff`。

## その他のメモ

- ユーザーに戻るのは「単位の提出」と「割り込み」のみ。コミットは単位ごとに Claude Code が行う。案内は `npm run serve`（= `python3 -m http.server 8080 -d out`）で書く。
- 検証ポート: 既定 4173、Codex 4199 / 4198、`hitrect.mjs` 4177、`menu_views.mjs` 4178。
- `summary.json` の `commit` は検証時の HEAD（コミット前）を指す。03 は `8cd74f4` と記録されている。
- 単位 02 の基準 viewport は PC 1920×1000 / SP 375×700@2x（`run.mjs` の `STATE_UNITS`）。通常単位は 1080 / 812。
- 赤い注記ボックスの塗りは単位 14 / 17（PC-2 `2:4721` (1544,8051 265×98)、PC-3 `2:4735` (1501,5486 303×135)）。
- 前回ハンドオフ: `thoughts/handoffs/2026-09-07_19-45-00_unit02-menu-submitted-awaiting-approval.md`。
