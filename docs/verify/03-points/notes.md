# 単位 03 Point 01–03：検証記録（2026-09-07）

## 条件

- 正解: `build/img/pc/PC-1_03_point01.png`（1920×450）/ `PC-1_04_point02.png`（1920×548）/ `PC-1_05_point03.png`（1920×450）、`build/img/sp/SP-1_03_point01.png`（750×426）/ `SP-1_04_point02.png`（750×502）/ `SP-1_05_point03.png`（750×430）。`design/*.pdf` p.1 を pdftocairo 72dpi で描画（`docs/slices.json`）。
- ブラウザ: Chromium 153（Playwright）、`--force-color-profile=srgb --disable-lcd-text --hide-scrollbars`。PC viewport 1920×1080・DPR 1、SP viewport 375×812・DPR 2。
- 比較: pixelmatch threshold 0、includeAA。`node tools/verify/run.mjs --unit 03-points`（要素撮影 `scale: device`）。継ぎ目は境界の上下 40 CSS px を fullPage 撮影し、正解 2 枚の連結と比較。

## 結果（`summary.json`、commit 8cd74f4 時点の HEAD）

| device | 撮影 | 位置 (CSS px) | diff | total | % |
|---|---|---|---:|---:|---:|
| PC | PC-1_03_point01 | y 970, 1920×450 | 0 | 864,000 | 0.000 |
| PC | PC-1_04_point02 | y 1420, 1920×548 | 0 | 1,052,160 | 0.000 |
| PC | PC-1_05_point03 | y 1968, 1920×450 | 0 | 864,000 | 0.000 |
| PC | 継ぎ目 fv／point01、point01／point02、point02／point03 | y 970 / 1420 / 1968 | 0 / 0 / 0 | 153,600 each | 0.000 |
| SP | SP-1_03_point01 | y 660, 375×213 | 0 | 319,500 | 0.000 |
| SP | SP-1_04_point02 | y 873, 375×251 | 0 | 376,500 | 0.000 |
| SP | SP-1_05_point03 | y 1124, 375×215 | 0 | 322,500 | 0.000 |
| SP | 継ぎ目 fv／point01、point01／point02、point02／point03 | y 660 / 873 / 1124 | 0 / 0 / 0 | 120,000 each | 0.000 |

- 横スクロールなし（PC scrollWidth 1920 = clientWidth、SP 375 = 375）。console error なし。要素矩形に端数なし（`subpixel: false`）。文書高さ PC 2418 / SP 1339 CSS px（= 切り出し合計）。
- 回帰: `run.mjs --unit 01-header-fv --no-build --port 4174`、`--unit 02-menu --no-build --port 4175` とも PASS（全 0 画素）。

## この単位で直したこと

1. **SP 切り出しの奇数高さ**: 旧 `SP-1_03_point01`（1320–1745、425px）は CSS 212.5px になり、Chromium が 213px（426 device px）に丸めて拡縮 → 差分 143,860 画素（45.0%）、`SP-1_04_point02`（503px）はサイズ不一致。境界を 1746 に移して 426 / 502 px にした。他の SP 奇数境界も同時に修正（`docs/sections.md` 単位 03 実装記録）。`tools/pdf_slice.py` に `dpr` 整列チェックを追加。
2. **`run.mjs` の継ぎ目撮影**: `boundingBox()` は viewport 相対なのに fullPage clip に使っていた。viewport の外（y ≥ 1080 / 812）にある区画の継ぎ目が全面差分（PC 99.7〜100%）になっていた。`window.scrollX/Y` を足してページ相対にした。
3. **`public/img` の古い画像**: `pdf_slice.py --out=build/img` だけ再実行すると `public/img`（`out/` に入る）が旧サイズのまま。両方に出力して `cmp` で全一致を確認。

## 残課題・要確認

- ページ境界 SP-1/SP-2（累積 9377）と SP-3/SP-4（累積 27287）は奇数で、単位 10・17 でページをまたぐ 1 枚の切り出しが必要（`pdf_slice.py` の連結対応）。
- Codex 独立検証は OpenAI 利用上限（`try again at 11:02 PM`）のため未実施。`docs/verify/03-points/codex.md` 参照。
- この単位に当たり判定・リンクは無い。alt は `lib/alt.json`（PDF 本文をそのまま。SP の 1 行目は「徒歩1分の」と PC と異なる原文どおり）。
