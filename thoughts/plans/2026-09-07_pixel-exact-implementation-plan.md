---
date: 2026-09-07
status: draft（ユーザー確認待ち）
supersedes: tools/build_html.py ドラフト（静的 HTML 版）
---

# FOLLOW LP 画素差分 0.000% 実装計画（Next.js）

## 1. ゴールと考え方

- **ゴール**: 元デザインとブラウザ表示の画素差分 0.000%（基準幅・基準 DPR で 1 画素も違わない）。
- **考え方**: 「AI に再現させる」のではなく「デザインがすでに持っている本物の画素を、正しい位置にそのまま置く」。
  ブラウザに描かせるのは配置だけ。文字・写真・装飾のラスタライズはすべてデザイン側（PDF）で済ませる。
- **進め方**: 1 セクション（レビュー単位）ごとに「実装 → 元デザインと比較 → 差分ゼロまで修正 → Codex による独立検証 → ユーザー提出 → 承認」を回し、承認後に次へ進む。

## 2. 「一致」の定義（この定義でしか 0.000% は成立しない）

**2026-09-07 改定（ユーザー承認）**: レンダラを `pdftoppm`（Splash）から **`pdftocairo`** に変更した。理由: Splash は stroke adjust がハードコード有効で 72dpi の細線（ハンバーガー 3 本線）が 2px/3px に不揃いになる（`docs/verify/01-header-fv/render-analysis.md`、Codex 独立分析 `codex-render-analysis.md`）。PC を 144dpi・2x・DPR 2 にする案は一度実装・検証したが、ユーザー確認で見た目の差が小さいため **1x・DPR 1 に戻した**（同日夜、ユーザー指示）。

| 項目 | PC | SP |
|---|---|---|
| 正解画像 | `design/FOLLOW_LP_PC.pdf` を `pdftocairo -png -r 72`（1pt=1px、幅 1920）で描画した PNG | `design/FOLLOW_LP_SP.pdf` を `pdftocairo -png -r 72`（1pt=1px、幅 750）で描画した PNG |
| 配信画像 | 同じ PNG を CSS 幅 1920 に表示（1x） | 同じ PNG を CSS 幅 375 に表示（2x） |
| ブラウザ条件 | Chromium（Playwright）、viewport 幅 1920、DPR 1 | viewport 幅 375、DPR 2（device px 750） |
| 撮影 | セクション要素の矩形を clip 撮影（＋境界をまたぐ帯で継ぎ目確認） | 同左 |
| 比較 | `pixelmatch` threshold 0、AA 無視なし。差分画素数 / 総画素数 | 同左 |
| 合格 | 差分画素 0 個（0.000%） | 同左 |
| 記録 | `docs/verify/<unit>/<pc|sp>.json`（差分数・条件・コミット）と差分画像 | 同左 |

前提と制約:

- **Figma のスクリーンショットは正解に使わない。** Figma と PDF はレンダラ差で既に 0.5〜4.8% 違う（`docs/compare/pngdiff-2026-09-07.jsonl`）。両方に対して 0.000% は原理的に不可能なので、`CLAUDE.md` の決定どおり PDF を唯一の正解にする。
- **0.000% は基準幅・基準 DPR でのみ保証する。** それ以外の幅では同じ画像を比例縮小して表示する（再サンプリングが入るため差分ゼロにはならない。これは仕様として記録する）。PC を DPR 2（Retina）で見る場合も 1x 画像の拡大補間になるため 0.000% の対象外。
- **切り出し境界はデザイン px で整数。** `docs/slices.json` の `scale` が device ごとの倍率（現在 PC 1 / SP 1。2 にすると 144dpi 素材になる）。当たり判定の配置はデザイン px 基準の比率なので倍率に依存しない。
- **画面に見える画素はすべて PDF 切り出し PNG（可逆）から来る。** ブラウザにフォントを描かせない。CSS で色・線・角丸・影を描かない。`next/image` の最適化（再エンコード・リサイズ）は使わない（`unoptimized`）。
- **切り出し境界はすべて整数 px、配置はすべて整数 px。** 小数座標は 1 画素のブレンドを生むので禁止。SP は device px（750 基準）で整数にする。
- **固定要素（position: fixed / sticky）は基準状態では使わない。** 全ページ撮影で二重に写るため。ヘッダー固定・黒帯 CTA 固定が必要なら、撮影時は静的化するモードを用意する（要確認事項 2）。
- 検証は `next build`（静的書き出し）した成果物を配信して行う。`next dev` は開発用オーバーレイが混入する。

## 3. 動的セクションを 0.000% で成立させる方法

| 箇所 | 方法 | 正解との比較 |
|---|---|---|
| FAQ アコーディオン | **実テキスト**（ユーザー決定）。`<details>`/`<summary>`。Q 帯背景 #f1e7d4・罫線 #d9ccb6・シェブロン・文字色は `docs/sections.md` の実測値を CSS で再現。フォントは Web フォントで近似。各行の高さはデザイン値に固定 | 全開状態で PDF と比較し、差分率を**数値で記録**（0.000% は求めない）。FAQ 見出し帯と FAQ 以降のセクションは 0.000% を維持 |
| ハンバーガーメニュー | **2026-09-07 単位 02 で改定**: 展開図のヘッダー部は通常ヘッダーと異なる（PC はタグライン無し・× 置換）ため、PC-Menu（1920×1000）/ SP-Menu（750×1400）を **y=0 から全面**で `position: fixed` に重ねる（`#site-menu`、`role="dialog"`）。9 項目・閉じるボタンは当たり判定（項目は実装済みアンカーへの `a`、未実装は `aria-disabled` の `button`「リンク未設定」、閉じるは `button`）。Escape・フォーカス復帰・Tab 循環・`main` inert・背景スクロール抑止。基準 viewport より高い場合の展開図下は `#d1c1a2` 塗り（未定義領域、0.000% 対象外）。詳細 `docs/sections.md` | viewport 1920×1000 / 375×700@2x で開状態を撮影し、Menu ページの PDF と比較して 0.000%（`run.mjs --unit 02-menu`、`STATE_UNITS`） |
| Instructor | WordPress 連携なし（2026-09-07 決定）→ **静的画像**。左右矢印はデザイン通り描かれるが機能なし（要確認事項 4） | 通常の画像セクションとして比較 |
| CTA（体験予約・予約サイトはこちら） | 画像上に透明な `button` を当たり判定として配置。見た目には何も足さない。クリックで「リンク未設定」の案内を表示。`?debug=1` で矩形を可視化 | 通常状態で撮影するので差分に影響しない |
| 赤い注記ボックス（WordPressで編集／アコーディオン機能で…） | 実装しない。切り出し PNG に含まれてしまう場合は、注記の無い状態を PDF から得られないため、**注記部分を周囲の背景で塗る**必要がある。該当は PC-2 `2:4721` (1544,8051 265×98)、PC-3 `2:4735` (1501,5486 303×135) の 2 箇所。塗った領域は台帳に記録し、そこは「正解＝塗り後の画像」と定義する | 注記除去後の画像を正解にする（記録必須） |

## 4. 技術構成

- **Next.js**（App Router、TypeScript、`output: 'export'`、`images.unoptimized: true`）。成果物は `out/` の静的 HTML。サーバー不要で配置できる。
- **画像**: `public/img/{pc,sp}/*.png`（`build/img` と同一、可逆 PNG、pdftocairo 72dpi）。PC は 1920px 幅を 1x で、SP は 750px 幅を 2x で表示する。PC 全体で約 18MB（144dpi 案は 64MB）。
- **レイアウト**: 各セクションは `width: 100%` の `<img>` を縦に積む。基準幅では 1:1。それ以外の幅では幅に比例して縮小。当たり判定は親要素に対する % 配置（幅・高さの比）。
- **ブレークポイント**: 要確認事項 3。
- **Python**: `tools/pdf_slice.py`（切り出し）、`tools/pngdiff.py`（Playwright が使えない時の予備）、FAQ 閉状態の期待画像合成、注記塗り。
- **検証ハーネス**（Node）: `tools/verify/shot.mjs`（Playwright で撮影）、`tools/verify/diff.mjs`（pixelmatch）、`tools/verify/run.mjs --unit fv`（ビルド→配信→撮影→比較→JSON 記録を一括）。
- **Codex 独立検証**: `tools/codex/verify-prompt.md` をテンプレートに、`sh tools/codex/verify.sh <unit>`（`codex exec --skip-git-repo-check -s danger-full-access -o docs/verify/<unit>/codex.md`。`workspace-write` では listen EPERM・Chromium 起動拒否）で実行。Codex 自身に `run.mjs` を再実行させ、数値の一致・差分画像の確認・キーボード操作（Tab 順、Escape、Enter/Space で開閉）・ハンバーガー／FAQ 操作後のずれ確認・横スクロール有無を報告させる。

## 5. レビュー単位（ユーザー確認の区切り案）

PC と SP は同じ単位で同時に仕上げる。番号順に進める。

| # | 単位 | PC 切り出し | SP 切り出し | 備考 |
|---|---|---|---|---|
| 0 | 基盤 | — | — | Next.js 雛形、画像コピー、検証ハーネス、Codex プロンプト。成果は #1 と同時に提出 |
| 1 | ヘッダー + FV | PC-1 header, fv | SP-1 header, fv | パイロット。ここで 0.000% が出る条件（色管理・整数配置）を確定 |
| 2 | ハンバーガーメニュー | PC-Menu | SP-Menu | 開閉・Escape・フォーカス復帰・アンカー 9 件 |
| 3 | Point 01–03 | PC-1 point01–03 | SP-1 point01–03 | |
| 4 | 体験バナー（CTA 1） | PC-1 trial-banner | SP-1 trial-banner | CTA 当たり判定「リンク未設定」 |
| 5 | キャンペーン | PC-1 campaign, gap | SP-1 campaign, gap | |
| 6 | セッション紹介 | PC-1 session | SP-1 session | |
| 7 | このような方に | PC-1 target | SP-1 target | |
| 8 | 効果 3 項目 | PC-1 effects, gap | SP-1 effects, gap | |
| 9 | リクエスト + カード 4 枚 | PC-1 requests | SP-1 requests | |
| 10 | 締め文 + 体験バナー 2（CTA 2） | PC-1 closing, trial-banner-2 | SP-1 closing / SP-2 trial-banner-2 | |
| 11 | 体験フロー STEP01–05（CTA 3） | PC-2 #1–12 | SP-2 #2–13 | |
| 12 | キャンペーン再掲 | PC-2 campaign, gap | SP-2 campaign, gap | |
| 13 | Personal Plan | PC-2 plan-heading, plans, gap | SP-2 plan-heading, plans | |
| 14 | Instructor | PC-2 instructor-heading, instructor-bg, gap | SP-3 instructor-heading, instructor-bg, gap | 注記塗り（PC） |
| 15 | Facility（見出し〜Studio 3 タイプ） | PC-3 #1–4 | SP-3 #4–7 | |
| 16 | プログラム（YOGA / PILATES / FRP / HAMMOCK） | PC-3 #5–7 | SP-3 #8–11 | |
| 17 | FAQ | PC-3 faq-heading, faq-ref | SP-4 faq-heading, faq-ref | 12 行を Q/A 別に再切り出し。注記塗り（PC） |
| 18 | Access + 地図 + フッター CTA | PC-3 #10–13 | SP-4 #3–6 | 固定バーの可否 |
| 19 | 全体通し | 全ページ | 全ページ | 継ぎ目・全ページ差分・メタ情報（title/description/OGP）・最終報告 |

## 6. 1 単位の手順（毎回同じ）

1. 切り出し確認（必要なら `docs/slices.json` を分割し `tools/pdf_slice.py` を再実行）。整数境界を確認。
2. セクションコンポーネント実装（`components/sections/<Unit>.tsx`）。当たり判定・動的要素を含む。
3. `node tools/verify/run.mjs --unit <unit>` → PC/SP とも差分 0 になるまで修正。
4. 通し確認: 先頭からこの単位までの継ぎ目帯を撮影・比較。
5. Codex 独立検証を実行し、結果を `docs/verify/<unit>/codex.md` に保存。指摘があれば修正して 3 から。
6. ユーザーへ提出: 差分数値（PC/SP）、条件、確認 URL（`python3 -m http.server` で `out/` を配信）、スクリーンショットのパス、残課題。**承認を得るまで次の単位に進まない。**

## 7. セッション運用ルール

- トークン使用量が 80% に達したら（残量表示が総量の 20% 以下になったら）、進行中の単位の途中でも `create-handoff` を実行し、続けて `resume-handoff` で再開する。ユーザーへ戻るのは「単位の提出」と「ユーザーの割り込み」の 2 場面に限る。
- 各単位の提出は、その単位の検証 JSON と Codex 報告が揃った状態でのみ行う。未測定の数値・「完全一致」の無根拠な報告はしない。

## 8. 実装前の確認事項（2026-09-07 ユーザー回答済み）

1. **FAQ の質問・回答は実テキスト**（ユーザー決定）。FAQ 本文だけは 0.000% の対象外。Q 帯の背景・罫線・シェブロンは CSS、文字は Web フォントで近似（フォント選定は #17 で確認: Adobe Fonts の 筑紫AオールドMin／秀英角ゴシック銀 か、Google Fonts の Noto で代替）。各行の高さはデザイン値に固定して Access 以降を 0.000% に保つ。Instructor は静的画像。
2. **ヘッダー・黒帯 CTA とも静的**。
3. **ブレークポイント 768px、1920px 超は中央寄せ**。
4. FAQ 初期状態（全閉・複数同時開可）と閉状態シェブロン向き、Instructor 矢印の扱いは #17 / #14 の提出時に確認する。
5. **ドラフト削除・`git init` 実施**。

## 9. 既知のリスク

- Chromium の色管理で PNG の画素値が変わる可能性 → パイロット（#1）で確認済み。`--force-color-profile=srgb --disable-lcd-text --hide-scrollbars` で起動し、pdftocairo の PNG（sRGB チャンク付き・アルファなし）は PC / SP とも差分 0 画素（72dpi・144dpi の両方で確認）。
- 正解画像のラスタライザ自体が artefact を持つことがある（Splash の stroke adjust。#1 で発覚し `pdftocairo` へ変更）。「差分 0 = デザインどおり」ではなく、正解画像がデザインどおりかを別途目視で確認する。
- Playwright の全ページ撮影は極端に高い（27,568px）ページで失敗することがある → セクション単位の clip 撮影 + 継ぎ目帯で代替。
- 注記ボックス除去は PDF に「注記なし」の状態が無いため、塗り処理が必要。塗り後の画像を正解と定義し、範囲を記録する。
- 商用フォントの Web 配信は行わない（画像化するため不要）。隠しテキストはシステムフォントで良い。
