---
date: 2026-09-07T18:21:26+09:00
git_commit: 00f110a
branch: master
status: complete
---

# Handoff: 0.000% 方針で Next.js 基盤 + 単位 01（ヘッダー + FV）完成、ユーザー承認待ち

## タスク

FOLLOW LP（ピラティス／ヨガスタジオ、豊洲）を Figma／PDF デザインと **画素差分 0.000%** で再現する。ユーザー指示（2026-09-07）で方針が大きく更新された。すべて `CLAUDE.md` に記録済み（「再現度の基準」「進行ルール」節）。

- [完了] ユーザー指示の CLAUDE.md への記録（0.000% の定義、単位ごとの進行ルール、トークン 80% で自動 handoff、Next.js、WordPress なし、赤い注記は無視、FAQ・ハンバーガー必須、タイトル・説明文を仮決定）
- [完了] 実装計画 `thoughts/plans/2026-09-07_pixel-exact-implementation-plan.md`（§5 に全 19 レビュー単位の表、§6 に 1 単位の手順）
- [完了] ユーザーへの事前確認（回答）: **FAQ の Q/A は実テキスト**（0.000% の対象外、数値記録に切替）／ヘッダー・黒帯 CTA は**静的**／ブレークポイント **768px**、1920px 超は**中央寄せ**／旧ドラフト削除・**git init 実施**
- [完了] 単位 0（基盤）: Next.js 16 静的書き出し、切り出し PNG 積み上げ、当たり判定、検証ハーネス、Codex 検証スクリプト
- [完了] 単位 01（header + fv）: PC/SP とも差分 0 画素。Codex 独立検証も合格（`docs/verify/01-header-fv/`）
- [**ユーザー承認待ち**] 単位 01 を提出済み。承認後に単位 02（ハンバーガーメニュー）へ
- [未着手] 単位 02〜19（計画書 §5）

## 重要な参照資料

- `CLAUDE.md` — 正本。特に「再現度の基準：画素差分 0.000%」「進行ルール」節
- `thoughts/plans/2026-09-07_pixel-exact-implementation-plan.md` — 単位表・手順・リスク
- `docs/sections.md` — 座標台帳（CTA 矩形、メニュー項目、FAQ 行）。`docs/slices.json` — 切り出し定義

## 最近の変更

- `CLAUDE.md:25-30` 動的要素・注記・タイトル・技術、`:38` Codex 呼び出し注意、`:40-66` 0.000% 基準と進行ルール、`:96` 文字画像化ルール、`:119` 合格条件 0.000%
- `docs/slices.json:10-11` point02/point03 境界 1968.5 → 1968（整数化）
- 新規 Next.js: `package.json`（scripts: dev/build/images/verify/serve）、`next.config.ts`（output export, unoptimized）、`tsconfig.json`、`app/layout.tsx`（title/description）、`app/globals.css`、`app/page.tsx`（OVERLAYS に当たり判定を切り出し名で登録）
- `lib/page.json` — ページ構成の唯一のソース（sections: id / unit / pc[] / sp[]）。現在 header と top の 2 区画
- `lib/design.ts` — slices.json から切り出し索引を作る（`slice(name)`, `pct()`）
- `lib/alt.json` — 切り出し名 → alt。**未登録だとビルド時に throw**
- `components/Section.tsx` — PC/SP 切り出し数が同じなら `<picture>` で対にする。`data-slice-pc` / `data-slice-sp` 属性が検証の鍵
- `components/HitArea.tsx`（HitButton / HitLink、% 配置）、`components/Menu.tsx`（MenuProvider / MenuButton、`aria-controls="site-menu"` の参照先は単位 02 で作る）、`components/DebugFlag.tsx`（`?debug=1`）
- `tools/verify/run.mjs` — 検証ハーネス。`tools/codex/verify-prompt.md` + `tools/codex/verify.sh` — Codex 検証
- 削除: `index.html`, `css/`, `js/`, `tools/build_html.py`（未検証ドラフト）
- `public/img/{pc,sp}/` = `build/img` のコピー（gitignore。`npm run images` で再生成可）
- git 初期化。コミット 3 件（d70849e 初期、7fc3256 単位 01、35f6f66 修正、00f110a Codex 合格）。`.git` は約 221MB（assets/design/docs 画像を含む）

## 学んだこと

- **0.000% は初回で成立した。** 条件: 可逆 PNG を `<img width/height>` + `width:100%; height:auto` で 1:1 配置、PC 1920×DPR1、SP は 750px 素材を 375 CSS px × DPR2、Chromium 起動フラグ `--force-color-profile=srgb --disable-lcd-text --hide-scrollbars`、`locator.screenshot({scale:'device'})`、pixelmatch threshold 0 / includeAA true。色管理による画素変化は起きなかった。
- **継ぎ目検証**は `page.screenshot({fullPage:true, clip})` で境界 ±40px を撮り、正解 2 枚の合成と比較する（`run.mjs` の `seamReference`）。
- **`.hit { display:block }` は `.sp-only { display:none }` を上書きしていた**（同じ詳細度で後勝ち）→ Codex が「非表示デバイス側のボタンに Tab で到達する」と検出。`.hit` から display を外して解決。当たり判定を足したら必ず両幅で `getComputedStyle().display` を確認する。
- **Codex（gpt-6-astra）のブラウザ検証は `-s danger-full-access` が必要**（workspace-write は listen EPERM / Chromium 起動拒否）。`codex exec` の出力を `head` にパイプすると SIGPIPE で途中終了し `-o` が書かれない → ログファイルへリダイレクトする。1 回 5〜8 分、5〜6 万トークン。
- package.json に `"type":"commonjs"` があると Next.js の TS ビルドが失敗する（type フィールドは置かない）。
- Next.js が `tsconfig.json` を自動修正する（jsx: react-jsx、include に .next/dev/types）。放置でよい。
- pdftoppm の切り出しは `round()` するので slices.json の境界は整数にしておく（1 箇所直した）。

## 成果物

- `thoughts/plans/2026-09-07_pixel-exact-implementation-plan.md`
- `docs/verify/01-header-fv/summary.json`（差分 0: PC 230,400 / 1,632,000 / 継ぎ目 153,600、SP 90,000 / 900,000 / 継ぎ目 120,000）、`docs/verify/01-header-fv/codex.md`（合格）
- `build/verify/01-header-fv/{pc,sp}/*.png` 実装側撮影、`build/codex/` Codex の作業物（gitignore）
- Next.js 一式（上記）、`tools/verify/run.mjs`、`tools/codex/*`
- メモリ更新: `reference-codex-cli-usage`（sandbox と SIGPIPE の注意）

## 次のステップ

1. **ユーザーの単位 01 承認を待つ**（提出済み。確認方法 `npm run serve` → http://localhost:8080 、`?debug=1`）。承認前に次へ進まない。
2. 単位 02 ハンバーガーメニュー: `docs/sections.md` の「共通：ヘッダー・ハンバーガーメニュー」表を使う。PC-Menu（`build/img/pc/PC-Menu_01_menu.png` 1920×1000）/ SP-Menu（750×1400）の y≥120 部分を重ねる（切り出しを y 120 以降で追加するか、画像を上に -120px ずらして表示）。項目 9 件は実在アンカー（`#top` `#campaign` `#session` `#trial-flow` `#plan` `#instructor` `#facility` `#faq` `#access`。まだ無い id は該当単位で作る）、閉じるは button、Escape・フォーカス復帰・背景スクロール抑止、`id="site-menu"`。検証は viewport 1920×1000 / 375×700@2x で開状態を PDF ページ 4 / 5 と比較（`run.mjs` に「開状態撮影」のモードを足す必要あり）。
3. 単位 03 以降: `lib/page.json` に区画を追加 → `lib/alt.json` に alt 追加（`docs/pdf-text/*.lines.txt` から文言）→ `app/page.tsx` の OVERLAYS に CTA（HitButton、クリックで「リンク未設定」案内。未実装のコンポーネント）→ `node tools/verify/run.mjs --unit <unit>` → `sh tools/codex/verify.sh <unit> > build/codex/log-<unit>.txt 2>&1` → 提出。
4. 単位 14 / 17 で赤い注記の塗り（PC-2 `2:4721` (1544,8051 265×98)、PC-3 `2:4735` (1501,5486 303×135)）。塗り後の画像を正解と定義し記録する。
5. 単位 17 FAQ は実テキスト。フォント選定（Adobe Fonts か Noto）と初期状態・シェブロン向きをその時にユーザーへ確認。
6. トークン残量が総量の 20% 以下になったら単位途中でも `/create-handoff` → `/resume-handoff`。

## その他のメモ

- 検証ポート: ハーネス既定 4173、Codex は 4199 / 4198 を使う指示。
- `run.mjs --device pc|sp` で片側だけ、`--no-build` でビルド省略。
- FAQ 実テキスト決定により、`docs/sections.md` の FAQ 色・フォント実測（Q 帯 #f1e7d4、罫線 #d9ccb6、質問 筑紫AオールドMin R 22px、回答 DNP秀英角ゴシック銀 M 21.3px）が使える。
- ユーザーへ戻るのは「単位の提出」と「割り込み」のみ。それ以外は自律的に進める（CLAUDE.md 進行ルール）。
