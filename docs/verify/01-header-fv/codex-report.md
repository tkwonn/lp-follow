# 判定：合格（01-header-fv）

指定された PC 1920×1080 / DPR2、SP 375×812 / DPR2、Chromium 153.0.8010.12 で、ヘッダー・FV・継ぎ目の差分はすべて 0 画素。独自撮影と既存の実装側撮影も正解 PNG に一致した。判定対象は既存 `out/` のユニット 01。ビルドは再実行していない。

## 再測定値

`pixelmatch` threshold=0、includeAA=true。total は device px の画素数。

| device | slice | diff | total | % |
|---|---|---:|---:|---:|
| PC DPR2 | PC-1_01_header | 0 | 921,600 | 0.000% |
| PC DPR2 | PC-1_02_fv | 0 | 6,528,000 | 0.000% |
| PC DPR2 | header / fv 継ぎ目 | 0 | 614,400 | 0.000% |
| SP DPR2 | SP-1_01_header | 0 | 90,000 | 0.000% |
| SP DPR2 | SP-1_02_fv | 0 | 900,000 | 0.000% |
| SP DPR2 | header / fv 継ぎ目 | 0 | 120,000 | 0.000% |

## summary.json との一致

`docs/verify/01-header-fv/summary.json` と再実行結果の `devices` オブジェクト全体が一致した。差分数・総画素数・割合・画像サイズ・座標・subpixel・横スクロール・consoleErrors・継ぎ目を含む。すべての切り出しで sizeMismatch=false、subpixel=false、consoleErrors=[]。再実行の終了コードは 0、PASS。

標準コマンドは次の環境変数付きで実行した。標準ハーネスが検証資料を上書きするため、`redirect.cjs` でファイル操作の出力先だけを本作業ディレクトリへ転送した。撮影・比較ロジックと参照画像は変更していない。

```sh
NODE_OPTIONS='--require ./build/codex/unit01/redirect.cjs' node tools/verify/run.mjs --unit 01-header-fv --no-build --port 4199
```

ログ末尾の `docs/verify/...` はハーネスの固定表示。実際の保存先は `harness-docs/summary.json` と `harness-images/`。

独立比較では `build/verify/01-header-fv/{pc,sp}/` の既存 4 PNG と `build/img/{pc,sp}/` を読み、pixelmatch と RGBA 全チャンネルの直接比較を実施。両方法とも各画像 0 画素。独自 Playwright スクリプトの新規撮影 4 PNG でも両方法とも 0 画素だった。

## チェック結果

### 横スクロール・レスポンシブ

独自サーバー `python3 -m http.server 4198 -d out` と `independent.mjs` を使用。全幅 DPR2。

| viewport 幅 | scrollWidth | clientWidth | 読み込まれた画像 |
|---:|---:|---:|---|
| 1920 | 1920 | 1920 | PC |
| 1366 | 1366 | 1366 | PC |
| 1024 | 1024 | 1024 | PC |
| 768 | 768 | 768 | PC |
| 767 | 767 | 767 | SP |
| 375 | 375 | 375 | SP |
| 320 | 320 | 320 | SP |

全幅で横スクロールなし。console error、pageerror、HTTP 400 以上（404 含む）、requestfailed はすべて 0 件。PC/SP 基準幅の通常表示・debug 表示・操作中も同じ監視を継続した。

### 切り出しサイズ

| device / slice | CSS 高さ：期待 / 実測 | 撮影 PNG：実測＝正解 |
|---|---:|---|
| PC header | 120 / 120 | 3840×240 |
| PC fv | 850 / 850 | 3840×1700 |
| SP header | 60 / 60 | 750×120 |
| SP fv | 600 / 600 | 750×1200 |

期待値は `docs/slices.json` の y1−y0（SP はさらに 1/2）。CSS 幅は PC 1920、SP 375。画像要素の位置とサイズは device px で整数。

### ハンバーガー 3 本線

PC 正解・既存実装撮影・独自撮影それぞれで、線の中央 x=2950 device px、y=60〜149 を走査。RGB の各値が 128 未満の連続行は、上から y=69〜72、101〜104、131〜134。**線の太さはすべて 4 device px**。真ん中だけ太い現象はこの測定で再現しなかった。

各線の最初の暗色行で測った横方向の長さは 88 / 90 / 88 px。これは太さとは別の値で、正解・実装・独自撮影すべて同一。細線の太さの検証を「線の長さまで同一」とは解釈していない。

### アクセシビリティ・操作・debug

- 各表示幅の対象ユニットに可視の操作要素は button 1 件。可視の a は 0 件。アクセシビリティスナップショットの名前は「メニューを開く」。
- PC/SP とも最初の Tab でこの button に到達。`:focus-visible` が true、青 `rgb(0,95,204)` の 3px solid outline、offset 2px。撮影画像でもフォーカス枠を確認した。
- Enter → Space → クリックで `aria-expanded` は false → true → false → true。開状態ではアクセシブルな名前が「メニューを閉じる」に変わった（追加の role locator・ARIA スナップショットで確認、`open-accessibility.json`）。
- 通常時は背景透明、border 0、outline-style none。通常撮影は正解と差分 0。
- `?debug=1` では html.debug が付き、2px の赤い破線と赤い半透明背景に変化。PC/SP の debug スクリーンショットを保存した。
- 開いたあとフォーカスを外したヘッダー撮影も正解との差分 0。メニュー展開図は表示されなかった。これは依頼に明記されたユニット 02 の既知の未実装範囲。

## 指摘事項（今回の合格を妨げない注記）

1. **計画書に旧基準が残る。** `thoughts/plans/2026-09-07_pixel-exact-implementation-plan.md` §2 の表は `pdftoppm -r 72`・PC DPR1。依頼文と `CLAUDE.md` の改定済み基準と不一致。該当節を読むことで再現できる。今回 pdftoppm は使用せず、指定の `build/img/` を正解にした。PDF からの正解画像の再生成は実施していない。
2. **aria-controls の参照先がない。** PC/SP とも button の `aria-controls="site-menu"` に対する DOM 要素が存在しない。通常ページで `document.getElementById('site-menu')` を実行すると null。ユニット 02 の実装時に参照先も整備する必要がある。
3. **透明な当たり判定に微小な小数誤差がある。** 基準幅で PC button は `(1440,24,72,75.984375)`、SP は `(319.984375,12,48,40)` CSS px。台帳からの期待値はそれぞれ `(1440,24,72,76)`、`(320,12,48,40)`。通常ページの可視 button に `getBoundingClientRect()` を実行すると確認できる。画像切り出しの subpixel=false と矛盾しない（測定対象が別）。通常画像の差分は 0、Tab・クリックも正常だった。

## 証跡と変更確認

- [独自スクリプト](independent.mjs) / [独自測定 JSON](independent.json)
- [標準ハーネスのログ](harness.log) / [再実行 summary](harness-docs/summary.json)
- [出力先転送スクリプト](redirect.cjs)
- [PC フォーカス](pc-focus.png) / [SP フォーカス](sp-focus.png)
- [PC debug](pc-debug.png) / [SP debug](sp-debug.png)
- [ソース変更検査](source-integrity.json)

`app/`、`components/`、`lib/`、`docs/`、`tools/verify/` と `CLAUDE.md` の 105 ファイルを実行前後の SHA-256 で比較した。`docs/sections.md` と `docs/verify/01-header-fv/render-analysis.md` の 2 件で内容の変化を検出した。本検証ではこの 2 ファイルへの書き込みを実行しておらず、変更主体・変更内容は本検証から特定できない。他の 103 件（元の summary.json を含む）は一致。台帳の座標は検証開始時に読み取った値を使用した。本検証の作成・書き込み先は `build/codex/unit01/` のみ。
