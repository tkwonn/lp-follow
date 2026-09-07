# 単位 01 レビュー指摘の原因分析（2026-09-07）

ユーザー指摘: (1) ハンバーガー 3 本線の真ん中だけ太い、(2) フォントの太さが元デザインと違う、(3) 影が元デザインより濃い。
実装は正解画像（`pdftoppm -r 72`）と差分 0 画素なので、差は「正解画像の作り方」と「表示環境」にある。
作業ファイル: `build/probe/`（gitignore）。Codex の独立分析: `codex-render-analysis.md`。

## 結論

| 症状 | 原因 | 種類 |
|---|---|---|
| 真ん中の線だけ太い | 線は 3 本とも PDF 上 **2.2pt のストローク**（`2.2 w`、丸端。Codex が PDF オブジェクトで確認。288dpi 実測は 2.25px に量子化）。poppler Splash は stroke adjust（線の縁を画素格子にスナップ）が `SplashOutputDev.cc` でハードコード有効のため、72dpi では、位相により **2px / 3px / 2px** の全塗り行になる。Retina（DPR 2）ではさらに 2 倍拡大されて目立つ | 正解画像のラスタライズ artefact |
| フォントが太い／違う | 文字の面積（インク被覆率）は 72dpi Splash・cairo・288dpi・Figma すべて **8.11%** で同一。字形・ウェイトは一致している。違いは **1x ラスタを DPR 2 の画面で 2 倍拡大**して表示していることによるぼけ（Figma はベクタを DPR 2 でシャープに描く） | 表示環境（1x 画像 × Retina）。**仮説**: ユーザーの実機条件（DPR・ズーム・表示幅）は未取得 |
| 影が濃い | PDF と Figma の同領域を同縮尺で比較すると平均輝度差 −0.32、影域の画素比率 56.3% vs 56.7% でほぼ同一。PDF 側は最暗部（輝度 120–139）が 1.6% vs 0.5% とわずかに濃い。目立つ濃さの差は上と同じ 2 倍拡大による縁のにじみが主因 | 未確定。CMYK 変換説は否定（PDF は RGB のみ、ICC 指定で全画素無変化）。Codex は PC で「PDF の影が共通して濃い」を再現できず、SP ロゴ影付近のみ PDF が RGB 各約 3 暗い |

## 測定

### ハンバーガー行被覆（x 1453–1496、被覆率 0.90 = 線幅 43px 中の塗り）

| レンダリング | 線 1 | 線 2 | 線 3 |
|---|---|---|---|
| 288dpi Splash（真値） | 34.50–36.75（9 行×0.25） | 50.25–52.50（9 行） | 65.50–67.75（9 行） |
| 72dpi Splash（現行正解） | 35, 36（2 行、全塗り） | **50, 51, 52（3 行、全塗り）** | 66, 67（2 行） |
| 72dpi cairo | 34:0.42 35:0.90 36:0.66 | 50:0.60 51:0.90 52:0.48 | 65:0.42 66:0.90 67:0.66 |
| 144dpi Splash | 34.5–36.0（4 行） | 50.5–52.0（4 行） | 65.5–67.0（4 行） |
| 144dpi cairo | 5 行（AA 縁あり） | 6 行（AA 縁あり） | 5 行（AA 縁あり） |

- 72dpi Splash では部分被覆のグレー行が出ない（全行 0.90）＝ AA ではなく格子スナップ。`-thinlinemode none|solid|shape` は出力同一（無効果）。
- 144dpi Splash では 3 本とも 4 device px（= 2 CSS px）で等しい。

### タグライン「マシンピラティス／…」(x 798–1058, y 30–86) のインク被覆

| レンダリング | 平均インク% | 輝度<128 の画素% |
|---|---|---|
| 72dpi Splash | 8.11 | 8.76 |
| 72dpi cairo | 8.11 | 8.65 |
| 288dpi Splash | 8.11 | 8.96 |
| Figma スクリーンショット（0.5x） | 8.11 | 8.57 |

### FV 見出し影 (x 280–700, y 200–320)、PDF 288dpi→0.5x と Figma 0.5x を同縮尺で比較

- 平均輝度差 PDF−Figma = −0.32。PDF が 6 以上暗い画素 4.9%、明るい画素 1.6%。
- 輝度 120–139: PDF 1.6% / Figma 0.5%。140–159: 31.2% / 35.2%。160–179: 33.1% / 30.3%。
- PDF は DeviceRGB のみ（DeviceCMYK なし、`pdfimages -list`）。CMYK 変換による色ずれは無い。

### 表示環境の再現（`build/probe/shot_dpr2.mjs`）

viewport 1920・DPR 2 で現行ビルドを撮影すると、1x PNG が Chromium で 2 倍補間され、線 2 が太く・文字がぼけて写る（`build/probe/ham_dpr2_1920.png`, `tag_dpr2_1920.png`）。144dpi 描画（`ham_144_true2x.png`, `tag_144_true2x.png`）ではデザインどおり。

## Codex 独立分析（`codex-render-analysis.md`）との照合

- ハンバーガー: 一致。Codex は libpoppler を直接呼ぶ C++ で stroke adjust を ON/OFF し、OFF で全塗り行がグレー部分被覆に変わることを実証。PDF の `/SA false` や `-thinlinemode` は無効（ソースで更新処理が `#if 0`）。
- 文字: 一致。被覆率は Splash 10.536% / cairo 10.534% で同一。1x→DPR2 拡大で灰色画素が約 4 倍に増えるが積分被覆は不変（＝太さは同じで縁がぼける）。Retina が主因かは仮説扱い。
- 影: Codex は原因未確定と判定。CMYK 説は否定、Figma との平均色差は ROI により符号が逆転。ユーザーが見た具体的な箇所と表示条件を揃える必要あり。
- 対策: Codex は B（cairo）を第一候補、A（144dpi・DPR2）を組み合わせることを推奨。ブラウザ実測で Splash 144dpi PNG を CSS 1920 / DPR 2 に置くと差分 0 を確認。

## 対策案

| 案 | 内容 | 効果 | 副作用・コスト |
|---|---|---|---|
| **A（推奨）** | PC の正解・配信画像を **144dpi（3840px 幅）**にし、CSS 幅 1920 で表示。検証は PC も **DPR 2** で撮る | 3 症状すべて解消（線は 4 device px で等幅、文字・影は Retina で正確）。SP は既に 750px 素材＝2x なので変更不要 | PC 画像が約 2.5 倍（fv 694KB→1.73MB、PC 全体 18MB→約 45MB 見込み）。DPR 1 の画面では 2x→1x の縮小補間になり、その条件では 0.000% を定義しない。`CLAUDE.md` の比較条件（PC DPR 1）を DPR 2 に改定 |
| B | レンダラを `pdftocairo` に変更 | 72dpi でも線幅が均一（AA 縁付き） | 文字の AA 分布が変わるだけで Retina のぼけは残る。単独では不十分 |
| C | ICC 指定で色補正 | 該当なし | PDF は RGB のみ。影の差は色変換由来ではない |
| D | Figma スクリーンショットを正解にする | ユーザーの見ている絵に近づく | Figma と PDF はレンダラ差で 0.5–4.8% 違う（`docs/compare/`）。`get_screenshot` は倍率固定・再取得が必要。方針変更が大きい |
| E | 細線だけ SVG/CSS 化 | ハンバーガーのみ解消 | 「見える画素はすべて PDF 由来」の原則に反し、文字・影は解消しない |

推奨は **A ＋ B（`pdftocairo -r 144` を PC の正解・配信画像にし、PC の検証を DPR 2 にする）**。A だけでも今回の 3 本線は等幅になるが、格子スナップ自体は残るので他の細線（罫線など）で再発しうる。cairo はスナップを行わず AA で描くため根本対策になる。SP は既に 2x 素材なので解像度は据え置き、レンダラのみ cairo に揃える（SP 側の再検証が必要）。

A を採用する場合の作業: `tools/pdf_slice.py --scale=2`（PC のみ）→ `public/img/pc` 差し替え → `components/Section.tsx` の `width/height` を 2 で割る → `tools/verify/run.mjs` の PC を DPR 2 に → 単位 01 を再検証 → `CLAUDE.md` の比較条件を更新。

## 対策 A＋B 適用後の結果（2026-09-07、ユーザー承認後）

- 実施: `tools/pdf_slice.py` を `pdftocairo` 化し `docs/slices.json` に device 別 `scale`（PC 2 / SP 1）を追加。`lib/design.ts` に `imgWidth/imgHeight`（PNG 実寸）を追加し `<img width/height>` に使用。`tools/verify/run.mjs` の PC を DPR 2 に。切り出し PNG は RGB・アルファなし・sRGB チャンク付き。
- 再検証（`node tools/verify/run.mjs --unit 01-header-fv`、`summary.json`）: PC header 0/921,600、fv 0/6,528,000、継ぎ目 0/614,400。SP header 0/90,000、fv 0/900,000、継ぎ目 0/120,000。**すべて 0.000%**。横スクロールなし、console error なし。
- ハンバーガー 3 本線（新正解 = 実装撮影、x 2906–2992 device px）: 行被覆 line1 `69:0.84 70–72:0.90 73:0.42`、line2 `100:0.24 101–104:0.90 105:0.12`、line3 `131:0.84 132–134:0.90 135:0.42`。**積分幅は 3 本とも 3.96 device px で等幅**（旧: 2/3/2 px）。AA 縁のグレー行を含み格子スナップなし。
- クロップ画像: `crops/pc-hamburger-dpr2-x4.png`（新）、`crops/old-pc-hamburger-splash72-shown-at-dpr2.png`（旧、比較用）、`crops/pc-tagline-dpr2-x3.png`、`crops/pc-fv-heading-shadow-dpr2-x2.png`、`crops/sp-hamburger-dpr2-x4.png`。
- 影: 2x 化で縁のにじみは解消。PDF と Figma の固有差（平均輝度差 −0.32）は残るため、ユーザーが見た具体箇所と表示条件を提出時に確認する。
