# 単位 03 Point 01–03：単位固有の検証項目（Codex 用）

実装の要点: `lib/page.json` の区画 `points`（`section#points`、`data-unit="03-points"`）に PC 3 枚（`PC-1_03_point01` 1920×450 / `PC-1_04_point02` 1920×548 / `PC-1_05_point03` 1920×450）と SP 3 枚（`SP-1_03_point01` 750×426 / `SP-1_04_point02` 750×502 / `SP-1_05_point03` 750×430）を `picture` で対にして積む。当たり判定・リンク・動的要素なし。FV（`#top`）の直下、y=970（PC）/ 660 CSS px（SP）から始まる。

## 確認してほしいこと

1. `node tools/verify/run.mjs --unit 03-points --no-build --port 4199` を実行し、`docs/verify/03-points/summary.json` と数値が一致すること（slices 6 件・seams 6 件すべて diff 0、`subpixel: false`）。
2. 自分の Playwright スクリプトで、PC 1920×1080 DPR 1 / SP 375×812 DPR 2 の各切り出し要素（`[data-slice-pc="..."]` / `[data-slice-sp="..."]`）を `scale: "device"` で撮影し、`build/img/{pc,sp}/` の正解 PNG と pixelmatch threshold 0 で 0 差を再現すること。要素の `getBoundingClientRect()` が device px で整数であること（SP は CSS 213 / 251 / 215 px = device 426 / 502 / 430）。
3. FV と point01 の継ぎ目、point01/02、point02/03 の継ぎ目（境界の上下 40 CSS px）で正解 2 枚の連結と 0 差であること。
4. 幅 1920 / 1366 / 1024 / 768 / 767 / 375 / 320 で横スクロールが出ないこと。1920px 超で中央寄せ。
5. 3 枚の `img` に空でない `alt` があり、PDF 本文（`docs/pdf-text/PC-1.lines.txt` y 1209–1301 / 1627–1780 / 2147–2239）と一致すること。
6. ハンバーガーメニュー（単位 02）が回帰していないこと: `run.mjs --unit 02-menu --no-build --port 4198` が PASS。メニュー項目の `a`/`button` 構成は単位 02 と同じ（`#top` のみ `a`。`points` はメニューの target ではない）。
7. console error / 404 なし。`?debug=1` でこの区画には矩形が出ないこと（当たり判定なし）。
