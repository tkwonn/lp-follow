# 単位 02 ハンバーガーメニュー：検証記録（2026-09-07）

## 条件

- 正解: `build/img/pc/PC-Menu_01_menu.png`（1920×1000）/ `build/img/sp/SP-Menu_01_menu.png`（750×1400）。`design/*.pdf` の PC p.4 / SP p.5 を pdftocairo 72dpi で描画。
- ブラウザ: Chromium 153（Playwright）、`--force-color-profile=srgb --disable-lcd-text --hide-scrollbars`。PC viewport 1920×1000・DPR 1、SP viewport 375×700・DPR 2。
- 比較: pixelmatch threshold 0、includeAA。`node tools/verify/run.mjs --unit 02-menu`。

## 結果（`summary.json`）

| device | 撮影 | diff | total | % |
|---|---|---:|---:|---:|
| PC | 展開図要素 `PC-Menu_01_menu`（開状態） | 0 | 1,920,000 | 0.000 |
| PC | viewport 全体 1920×1000（開状態） | 0 | 1,920,000 | 0.000 |
| PC | `PC-1_01_header`（× をマウスで閉じた後） | 0 | 230,400 | 0.000 |
| PC | `PC-1_02_fv`（同） | 0 | 1,632,000 | 0.000 |
| SP | 展開図要素 `SP-Menu_01_menu`（開状態） | 0 | 1,050,000 | 0.000 |
| SP | viewport 全体 750×1400 device px（開状態） | 0 | 1,050,000 | 0.000 |
| SP | `SP-1_01_header`（× をマウスで閉じた後） | 0 | 90,000 | 0.000 |
| SP | `SP-1_02_fv`（同） | 0 | 900,000 | 0.000 |

参考値（合否に含めない）: Escape（キーボード）で閉じた直後のヘッダーは、開くボタンの `:focus-visible` リング（outline 3px + offset 2px）ぶんだけ差が出る。PC 972 画素（0.422%、x 1435–1516 / y 19–104）、SP 2,448 画素（2.720%）。キーボード操作後にフォーカス位置を可視化するのは意図した挙動。

操作確認（`summary.json` の `checks`、PC/SP とも全項目 OK）: 閉状態で `#site-menu` hidden・`aria-expanded=false`／開いたら閉じるボタンにフォーカス・`main` が `inert`／当たり判定 10 個・端数なし／ホイールでページが動かない／横スクロールなし／Tab 循環（閉じる→9 項目→閉じる）・Shift+Tab 逆順／Escape で閉じてフォーカスが開くボタンへ戻り `overflow`・`padding-right` が復元／マウス閉じ後も同様。

当たり判定の実測（device px、台帳と一致）: 閉じる PC (1437,37,48,48) / SP (651,38,48,48)。項目 PC x 598 幅 534、y 133/224/315/406/496/587/678/767/860（高さ 91,91,91,90,91,91,89,93,89）。SP x 90 幅 578、y 161/259/357/456/553/652/750/847/947（高さ 98,98,99,97,99,98,97,100,97）。

単位 01 回帰: `run.mjs --unit 01-header-fv` PC/SP とも全 0 画素（ヘッダー・FV・継ぎ目）。

## 基準外 viewport の見え方（`crops/`, `crops/views.json`）

- `pc-1920x1080-open.png`: 展開図の下 80px が `#d1c1a2` の塗り。右側の写真との境目が見える（デザイン未定義領域）。
- `pc-2200x1000-open.png`: 1920 で中央寄せ、左右は白（ページと同じ）。
- `pc-1366x768-open.png` / `pc-768x900-open.png`: 比例縮小。768 では展開図 400px 高＋塗り。
- `sp-767x900-open.png`: SP 展開図を 767 幅に拡大（1432px 高）、層内スクロール。
- `sp-375x667-open-*.png`: 700px の展開図が 667 の viewport で 33px ぶん層内スクロール（`layerScrollTop` 33）、ページは動かない。
- いずれも横スクロールなし（`hasHScroll` / `layerHScroll` false）。

## 決定・要確認

- 決定（実装）: 展開図は y=0 から全面。閉じるは展開図側の `button`。未実装アンカーは `aria-disabled` の `button`「リンク未設定」で明示（`#top` のみ `a`）。
- 要確認 1: 基準より高い viewport で展開図の下を `#d1c1a2` で埋める扱い（代案: 白のまま／別の色／展開図を `object-fit: cover` で拡大＝基準外でレイアウトが変わる）。
- 要確認 2: SP で viewport が 700 CSS px 未満の端末では展開図の下部（写真部分）が層内スクロールになる。項目 9 件と × は 1044/2=522px 以内に収まるので、高さ 568（iPhone SE 相当）でも操作部は見える。
- 要確認 3: 「Top」のリンク先は台帳どおり `#top`（FV 区画、y=120）。ページ最上部（ヘッダー含む）へ戻したい場合は `#header` に変更する。
