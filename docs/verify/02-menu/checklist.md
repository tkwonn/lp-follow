# 単位 02 ハンバーガーメニュー：単位固有の検証項目（Codex 用）

実装の要点（`components/Menu.tsx`、`lib/menu.ts`、`app/globals.css` の `.menu-layer`）:

- 展開図 `PC-Menu_01_menu.png`（1920×1000）/ `SP-Menu_01_menu.png`（750×1400）を `#site-menu`（`role="dialog"`、`aria-modal`、`position: fixed; inset: 0`）に **y=0 から全面**で重ねる。展開図のヘッダー部は通常ヘッダーと異なる（PC はタグライン無し・× に置換）ため、y≥120 だけの重ねは不可。
- 基準 viewport は **PC 1920×1000（DPR 1）/ SP 375×700（DPR 2）**。この条件で viewport 全体の撮影が展開図 PNG と 0 差になる。
- 当たり判定 10 個: 閉じる `button` PC (1437,37,48,48) / SP (651,38,48,48)、項目 9 件は区切り線の間（PC x 598–1132、y 133/224/315/406/496/587/678/767/860/949。SP x 90–668、y 161/259/357/456/553/652/750/847/947/1044）。項目 1「Top」だけ `a[href="#top"]`、残り 8 件はリンク先セクション未実装のため `button[aria-disabled="true"]`（名前に「リンク未設定」を含む）。
- 挙動: 開いたら閉じるボタンへフォーカス／Escape で閉じる／閉じたら開くボタン（`[aria-controls="site-menu"]`）へフォーカス復帰／Tab は閉じる→項目 1〜9→閉じる で循環／開いている間 `main` は `inert`、`html` は `overflow: hidden`（スクロールバー幅ぶん `padding-right` 補正）。
- 展開図より下（viewport が 1000 / 700 CSS px より高い場合）は `#d1c1a2` の塗り（デザイン未定義領域、0.000% 対象外）。低い場合は `#site-menu` 内だけ縦スクロール。

## 確認してほしいこと

1. `node tools/verify/run.mjs --unit 02-menu --no-build --port 4199` を実行し、`docs/verify/02-menu/summary.json` と数値が一致すること（`slices`・`viewportShots` の diff、`hits` の devicePx、`checks` の合否）。`@escaped-focus-ring` は参考値（`informational: true`）で合否に含めない。
2. 自分の Playwright スクリプトで、PC 1920×1000 DPR 1 / SP 375×700 DPR 2 でハンバーガーをクリックし、viewport 全体の撮影が `build/img/{pc,sp}/*Menu*.png` と 0 差であることを再現する。
3. 開状態の当たり判定 10 個の `getBoundingClientRect()` が上記座標（device px）と一致し、端数がないこと。
4. キーボード: Tab 循環（閉じる→9 項目→閉じる、Shift+Tab は逆順）、Escape で閉じてフォーカスが開くボタンに戻ること、Enter/Space で閉じるボタンが動くこと。開いている間、背景（`main`）の当たり判定へ Tab で到達しないこと。
5. 開いている間、ホイール／キー操作でページ（`window.scrollY`）が動かないこと。閉じた後 `html` の `overflow` / `padding-right` が元に戻ること。
6. 開閉を繰り返した後、ヘッダーと FV（`PC-1_01_header`, `PC-1_02_fv` / SP 同様）が正解と 0 差のままであること（マウスで閉じた場合。キーボードで閉じた場合は開くボタンにフォーカスリングが出るのが正しい）。
7. 幅 1920 / 1366 / 1024 / 768 / 767 / 375 / 320 で、開状態・閉状態とも横スクロールが出ないこと（`document.documentElement` と `#site-menu` の両方）。
8. viewport が低い場合（例 375×568）に `#site-menu` 内で縦スクロールでき、ページ本体は動かないこと。高い場合（例 1920×1080）に展開図の下が `#d1c1a2` で埋まること。
9. `?debug=1` で 10 個の矩形が可視化され、通常表示では見えないこと。console error / 404 が無いこと。
