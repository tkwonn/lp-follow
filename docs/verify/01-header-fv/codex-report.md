# 独立検証：01-header-fv

## 判定：合格

既存の `out/` を Chromium 153.0.8010.12 で検証。PC は幅1920・DPR1、SP は幅375・DPR2。全4スライスと2継ぎ目で差分0画素。指定7幅で横スクロールなし。操作・フォーカス・デバッグ表示も確認した。

## 再測定値

| device | slice | diff | total | % |
|---|---|---:|---:|---:|
| PC | PC-1_01_header | 0 | 230,400 | 0.000% |
| PC | PC-1_02_fv | 0 | 1,632,000 | 0.000% |
| PC | header / fv 継ぎ目 | 0 | 153,600 | 0.000% |
| SP | SP-1_01_header | 0 | 90,000 | 0.000% |
| SP | SP-1_02_fv | 0 | 900,000 | 0.000% |
| SP | header / fv 継ぎ目 | 0 | 120,000 | 0.000% |

`pixelmatch threshold=0, includeAA=true`。実装側の既存撮影、ハーネス再撮影、独自Playwright撮影の各4スライスを、それぞれ `build/img` の正解PNGと比較した。すべて差分0。別途RGBA各チャンネルの直接比較でも差分画素0。

## summary.json との一致

既存 `docs/verify/01-header-fv/summary.json` と再測定の `devices` オブジェクトは完全一致。差分数・総画素数・割合・サイズ・矩形・subpixel・scrollWidth/clientWidth・docHeight・consoleErrors・継ぎ目を含む。`pass` も一致した。

書き込み制限を守るため、無改変の `tools/verify/run.mjs` を `build/codex/rerun/tools/verify/` にコピー。隔離ディレクトリから既存 `out/`・`lib/`・`build/img/` をシンボリックリンクで参照し、次を実行した（終了コード0）。

```sh
cd build/codex/rerun
node tools/verify/run.mjs --unit 01-header-fv --no-build --port 4199
```

元スクリプトとコピー、元summaryと検証開始時のコピーは `cmp` で一致確認。ソース・既存レポートは編集していない。作業ファイルは `build/codex/` 内に作成した。今回ビルドは再実行していない。

## チェック結果

### 横スクロール

| viewport幅 | scrollWidth | clientWidth | 結果 |
|---:|---:|---:|---|
| 1920 | 1920 | 1920 | 合格 |
| 1366 | 1366 | 1366 | 合格 |
| 1024 | 1024 | 1024 | 合格 |
| 768 | 768 | 768 | 合格 |
| 767 | 767 | 767 | 合格 |
| 375 | 375 | 375 | 合格 |
| 320 | 320 | 320 | 合格 |

bodyのscrollWidthも同値。768pxではPC画像、767pxではSP画像がロードされた。375pxはDPR2、その他はDPR1で確認。

### サイズ・配置

| device / slice | CSS実測（幅×高さ） | device PNG実寸 | docs/slices.jsonとの一致 |
|---|---|---|---|
| PC header | 1920×120 | 1920×120 | 一致 |
| PC fv | 1920×850 | 1920×850 | 一致 |
| SP header | 375×60 | 750×120 | 一致（高さ1/2） |
| SP fv | 375×600 | 750×1200 | 一致（高さ1/2） |

全要素のdevice px座標・寸法は整数、subpixel=false。FV開始YはPC120 / SP60 CSS px。

### PCハンバーガーの線幅

正解PNG・実装側撮影・独自撮影の3画像で測定した。白背景からの被覆を `(255-R)/255` として、線に垂直なY方向へ積算。端部を除く x=1455〜1493 の39列すべてで、上・中・下の3本とも `504/255 = 1.9764705882352942 px` と厳密一致した。対象Yは上34〜36、中50〜52、下65〜67。中央だけ3pxになる不具合は観測しなかった。

端部も含めた x=1440〜1511 の総被覆量は、上88.4196078431 / 中88.4274509804 / 下88.4274509804 px²。上と中・下には2/255 px²の微小差があり、「端部を含む総被覆量まで完全同一」ではない。これは正解PNGにも存在し、撮影にも同じ値で写る。線幅の判定は直線部分の積分幅に基づく。

### 操作・アクセシビリティ

- 本ユニットの表示中の操作要素はPC・SPともメニューボタン1個。表示中のa要素なし。
- Playwrightのアクセシビリティスナップショットで名前「メニューを開く」を確認。開くと「メニューを閉じる」に変化。
- 最初のTabで到達。`tabIndex=0`。フォーカス時は `3px solid rgb(0,95,204)`、offset 2px。PC・SPの撮影画像でも青い枠が見えることを確認。
- Enterで `aria-expanded=false→true`、Spaceで `true→false`。クリックでも両方向の切り替えを確認。
- 当たり判定はPC `(1440,24,72,76)`、SP CSS `(320,12,48,40)`。`docs/sections.md` のPC値とSP値の1/2に一致。
- 通常時は背景透明・outline-style:none。通常の正解画像比較も差分0。
- `?debug=1` は赤い2px破線と背景 `rgba(255,0,0,0.12)`。PC・SPを撮影し、SP画像を目視確認。通常URLへ戻すと透明・outlineなしに復帰。
- メニューを開いた状態でフォーカスを外してヘッダーを撮影しても正解との差分0。展開図は表示されない。依頼で明記されたユニット02の既知事項として扱った。

### エラー

独自サーバー `python3 -m http.server 4198 --bind 127.0.0.1 -d out` に対する上記7幅・通常/デバッグ遷移・操作で、console error 0件、pageerror 0件、HTTP 404 0件、requestfailed 0件。ハーネス側consoleErrorsも両端末とも空。

## 指摘事項

修正必須の指摘なし。細線の端部込み総被覆量の微小差は上記実測のとおり。再測定は配信サーバー起動後、リポジトリルートで次を実行できる。

```sh
node build/codex/independent.mjs
node build/codex/line-width.mjs
```

## 証跡

- [独自検証スクリプト](independent.mjs) / [数値・操作記録](results.json)
- [線幅検証スクリプト](line-width.mjs) / [39列の線幅測定](line-width.json)
- [再実行ログ](rerun.log) / [再実行summary](rerun/docs/verify/01-header-fv/summary.json)
- [PCフォーカス](pc-focus.png) / [SPフォーカス](sp-focus.png)
- [PCデバッグ](pc-debug.png) / [SPデバッグ](sp-debug.png)
