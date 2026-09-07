---
date: 2026-09-07T17:42:57+09:00
git_commit: n/a（git リポジトリ未初期化）
branch: n/a
status: complete
---

# Handoff: セクション台帳・PDF 切り出し完了、HTML 実装は着手前で保留

## タスク

FOLLOW LP（ピラティス／ヨガスタジオ、豊洲）を Figma デザイン基準で忠実再現する。方針は「PDF をセクション単位で画像化して積み上げ、CTA は当たり判定座標のみ保持（リンク未設定を明示）、FAQ・ハンバーガー・Instructor は HTML 実装」（`CLAUDE.md`）。

前セッション（`thoughts/handoffs/2026-09-07_17-07-05_figma-artboard-split-and-pdf-verification.md`）の「次のステップ」1〜3 を本セッションで完了した。

- [完了] 9 フレームの `get_metadata` を取得し `docs/figma-meta/<frame>_<id>.xml` に保存（PC-Menu / SP-Menu は応答が小さく直接保存、他 7 枚は tool-results から `jq -r '.[0].text'` で抽出）
- [完了] PDF 文字座標の抽出（`pdftotext -bbox-layout` → `docs/pdf-text/PC-{1..4}.xml`, `SP-{1..5}.xml`、行一覧 `*.lines.txt`）
- [完了] フォント・色の抽出（`pdftohtml -xml` → `docs/pdf-text/fonts/{PC-2,PC-3,SP-3,SP-4}.xml`）
- [完了] セクション台帳 `docs/sections.md`（全 9 フレームの境界・CTA 矩形・FAQ 12 行・メニュー 9 項目・Instructor カード）
- [完了] PDF セクション切り出し `docs/slices.json` → `build/img/{pc,sp}/` 各 49 枚（合計 29MB、1x）。隙間・重なりなしを `tools/pdf_slice.py` の検査で確認
- [保留・ユーザー指示] HTML 実装。**ユーザーから「まだ実装には取り掛からないで」の指示あり**。ただし指示より先に `tools/build_html.py` / `index.html` / `css/style.css` / `js/main.js` を生成してしまった。ブラウザ確認・差分検証は一切未実施の**未検証ドラフト**。残すか削除するかはユーザー判断待ち
- [未着手・要入力] ページタイトル・説明文、WordPress 連携の有無、フォントの Web 配信ライセンス

## 重要な参照資料

- `CLAUDE.md` — 制作指示の正本。本セッションで「データ取得の役割分担」節に docs/tools へのポインタを追記
- `docs/sections.md` — セクション台帳（実装時の唯一の座標ソース。座標はフレーム相対 px、1pt=1px）
- `docs/codex-review-2026-09-07.md` — Codex 推奨（FAQ は details/summary、動的部分以降を固定 Y にしない、CTA はダミー href 禁止）

## 最近の変更

- `CLAUDE.md` 「データ取得の役割分担」節 — figma-meta / pdf-text / sections.md / slices.json / pdf_slice.py へのポインタ 3 行を追記
- `docs/sections.md` — 新規（台帳本体）
- `docs/slices.json` — 新規（切り出し定義。全ページで連続・高さ一致を検査済み）
- `docs/figma-meta/*.xml`（9 枚）+ `*.outline.txt`（`figma_meta_outline.py` の出力保存）
- `docs/pdf-text/*.xml`, `*.lines.txt`, `fonts/*.xml` — 新規
- `tools/figma_meta_outline.py` — get_metadata XML の要約（グループ直下ノード / rounded-rectangle / 全幅ノード）
- `tools/pdf_text_lines.py` — bbox-layout XML を行単位に平坦化
- `tools/pdf_slice.py` — slices.json に従い pdftoppm で切り出し（`--scale=2` で 2 倍も可）
- `tools/pngpick.py` — 純 Python の画素色サンプリング（at / darkest / mode）
- `tools/build_html.py`, `index.html`, `css/style.css`, `js/main.js` — 未検証ドラフト（上記のとおり保留）
- `build/img/pc/`, `build/img/sp/` — 切り出し画像 98 枚

## 学んだこと

- **get_metadata の座標はフレーム相対**で、PDF の pt 座標と一致する（PC-1 の CTA ボタン `2:9988` (1134,2771) と PDF 文字「体験セッションを予約する」x 1184–1438 / y 2794–2823 が整合）。Figma スクリーンショットは不要。
- **`pdftotext -bbox-layout` で文字列と座標が取れる。** 字間を空けた文字は 1 文字ずつ word に分かれるので `pdf_text_lines.py` で結合している。`pdftohtml -xml` の座標・フォントサイズは **1.5 倍スケール**（例: fontspec size 33 → 22px）。
- **CTA ボタンは DESIGN グループ内の約 394×81（PC）/ 405×81（SP）の Group** として一意に特定できる（`sections.md` の CTA 表）。
- **区切り線は高さ 0 の vector**（`figma_meta_outline.py` のフィルタで落ちるので、`height<1 and width>=600` で別途抽出）。PC-3 は PILATES と FRP の間に線が無く 1 ブロック、SP-3 は線あり。
- **PC-3 / SP-4 末尾の黒帯 CTA**（`2:556` / `2:575`）は固定フッターバーの可能性。**ヘッダー固定の有無**も不明。メニュー展開図は y=120 から始まりヘッダーが残る構成。
- **デザイン上の注記**（PC-2 「WordPressで編集」`2:4721`、PC-3 「アコーディオン機能でお願いします。」`2:4735`）は除去対象。
- **Instructor** は 3 名中 2 名が写真・紹介文なし（プレースホルダー色 #f6e9de）。SP は 2 枚表示で 3 人目が隠れる想定に見える。名前は PDF 上フルワイド英字（ＨＩＫＡＲＩ）。
- **FAQ の色**（画像サンプリング）: Q 帯 #f1e7d4、罫線 #d9ccb6、Q/A 文字 #333333、本文 #1a1a1a、シェブロン #4d4d4d、「予約サイトはこちら」枠 #aa872e。フォント: 質問 筑紫AオールドMin R 22px、回答 DNP秀英角ゴシック銀 M 21.3px（PC）。
- `get_metadata` は 1 フレーム 130〜280KB で tool-results ファイルに退避される。`jq -r '.[0].text'` で XML を取り出す。同一分内 5 回呼んでもレート制限には掛からなかった。
- Bash の `echo =====` は zsh の `=` 展開でエラーになる。macOS awk は `match(..., arr)` 非対応（Python を使う）。

## 成果物

- `docs/sections.md` — セクション台帳
- `docs/slices.json` — 切り出し定義
- `docs/figma-meta/{PC-Menu_14-2,PC-1_14-6,PC-2_14-10,PC-3_14-14,SP-Menu_18-2,SP-1_18-6,SP-2_18-9,SP-3_18-13,SP-4_18-17}.xml` と `.outline.txt`
- `docs/pdf-text/*.xml`, `*.lines.txt`, `fonts/*.xml`
- `build/img/pc/*.png`（49 枚）, `build/img/sp/*.png`（49 枚）
- `tools/figma_meta_outline.py`, `tools/pdf_text_lines.py`, `tools/pdf_slice.py`, `tools/pngpick.py`
- 未検証ドラフト: `tools/build_html.py`, `index.html`, `css/style.css`, `js/main.js`

## 次のステップ

1. **ユーザーに確認して決めてから実装再開**（ユーザーが「まだ実装には取り掛からないで」と指示済み）:
   - ブレークポイント（ドラフトは 768px 仮置き）
   - ヘッダー固定の有無、黒帯 CTA の固定の有無
   - FAQ 初期状態（全閉／先頭のみ開）と複数同時展開の可否
   - ページタイトル・説明文、WordPress 連携方法、フォントの Web 配信可否
   - 未検証ドラフト 4 ファイルを土台にするか削除するか
2. 実装再開時: `tools/build_html.py` の構成（`<picture>` で PC/SP 切替、当たり判定は % 配置、`--u = 1cqw/19.2 | 1cqw/7.5` の design-px 単位、FAQ は `details/summary`、Instructor は背景画像 + HTML カード、メニューは展開図画像 + 当たり判定）を叩き台にできる。ドラフトのまま使うなら必ずブラウザで表示確認する。
3. 検証: ブラウザスクリーンショット（幅 1920 / 375）を `docs/pdf-pages/` の PDF 画像と `tools/pngdiff.py` で比較し 1% 以下を目標。数値と条件を記録。
4. 必要なら `tools/pdf_slice.py docs/slices.json --scale=2 --out=build/img2x` で Retina 用 2 倍画像も生成。
5. git 未初期化のまま。実装ファイルが増える前に `git init` を検討。

## その他のメモ

- Figma MCP: `mcp__plugin_figma_figma__get_metadata`（fileKey `otnVHe5ZRTTez8xxxHCo0A`）。9 フレーム分は保存済みなので再取得しない。
- Codex は `codex exec ... - < prompt.md` で Bash から呼ぶ（メモリ `reference-codex-cli-usage`）。素材監査・独立検証の担当。
- ユーザーはスキル・設定をプロジェクト配下に置く方針（`.claude/` 配下）。
- 作業ディレクトリの Bash `cd` はセッション内で残るので絶対パスを使う。
