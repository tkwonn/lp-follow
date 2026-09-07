---
date: 2026-09-07T17:07:05+09:00
git_commit: n/a（git リポジトリ未初期化）
branch: n/a
status: complete
---

# Handoff: Figma アートボード分割・PDF 照合完了、実装前の座標取得へ

## タスク

FOLLOW LP（ピラティス／ヨガスタジオ）を Figma デザイン基準で忠実再現する。方針は「セクション画像を積み上げ、CTA は当たり判定座標のみ保持、FAQ・ハンバーガー・Instructor は HTML 実装」（`CLAUDE.md`）。

- [完了] 入稿素材の整理・リネーム（`assets/`、`ASSETS.md`）
- [完了] Codex による素材監査・ワークフロー相談（`docs/codex-review-2026-09-07.md`）
- [完了] Figma ファイルが「アウトライン化 SVG の一括貼り付け」であることの調査（テキストノード 0 件、Vector 8,197 個）
- [完了] Figma 上でバックアップページ作成（ページ `4:2`）
- [完了] ルート Group `2:3` をアートボード単位フレーム 9 枚に分割（本セッション）
- [完了] 9 フレームと PDF の画像差分比較。SP-2 / SP-3 の「88px / 77px 短い」疑いは解消（PDF 側の下端余白だった）
- [計画済み] 各フレームに対する `get_metadata` でセクション境界・CTA・FAQ・メニュー等の座標取得
- [計画済み] PDF をセクション単位で画像化し、HTML/CSS で積み上げ実装
- [未着手・要入力] ページタイトル・説明文、WordPress 連携の有無、フォントの Web 配信ライセンス

## 重要な参照資料

- `CLAUDE.md` — 制作指示の正本。2026-09-07 決定事項（CTA リンク先なし、PDF が見た目の正解、Figma は座標のみ）を含む
- `docs/figma-artboards.md` — 9 フレームの ID・座標・直下 Group ID・検証数値・残置物の台帳
- `docs/codex-review-2026-09-07.md` — Codex の推奨構成（FAQ は details/summary、動的部分以降を固定 Y にしない、等）

## 最近の変更

Figma ファイル `otnVHe5ZRTTez8xxxHCo0A` Page 1（`0:1`）への書き込み:
- フレーム作成 PC-Menu `14:2` / PC-1 `14:6` / PC-2 `14:10` / PC-3 `14:14` / SP-Menu `18:2` / SP-1 `18:6` / SP-2 `18:9` / SP-3 `18:13` / SP-4 `18:17`。各直下に元レイヤー名の Group（BACK画像 → BACKカラー → DESIGN）。絶対座標は不変。
- 旧レイヤー `2:4`(BACK画像) `2:488`(BACKカラー) は全要素移動時に Figma が自動削除。旧ラッパー `2:2` と `2:3` → `2:787` → `2:8311`（48×48 の透明な線 Group）は残置。

ローカル:
- `CLAUDE.md:13` — 「アートボード単位のフレームは存在しない」をフレーム ID 一覧に更新
- `docs/figma-scripts/01_split_artboards.js` — 実行済みスクリプトの修正版（レイヤー名を事前取得、注意点のコメント）
- `docs/figma-artboards.md` — 新規
- `tools/pngdiff.py` / `tools/pngcrop.py` — 新規。純 Python の PNG 差分・切り出し（この Mac に Pillow / numpy / ImageMagick が無いため）
- `docs/figma-frames/*.png`（Figma スクリーンショット 9 枚 + stray）、`docs/pdf-pages/*.png`（pdftoppm 出力）、`docs/compare/`（切り出し比較と `pngdiff-2026-09-07.jsonl`）

## 学んだこと

- **Figma 側の座標系**: PC は上端 y=-5277、SP は y=-5282。x はフレーム台帳参照。PDF ページサイズは PC 1920×(8826/8635/10107/1000)pt、SP 750×(9377/9353/8557/6018/1400)pt で 1pt=1px として扱う。
- **PDF の余白**: SP-1/2/3 の PDF は下端に約 106 / 92 / 80px の白余白、PC-2 は上端 92px・下端 140px の余白がある。「Figma 描画境界がページより短い」は欠落ではない。
- **差分数値**: Figma スクリーンショット vs pdftoppm は 0.5〜4.8% の差分画素率が出るが、目視でレンダラ差（AA、文字の太り、写真リサンプリング、1px 縦ずれ）のみ。実装時の差分検証は PDF 画像を基準にし、Figma スクリーンショットは基準に使わない（`CLAUDE.md` の役割分担どおり）。
- **use_figma の挙動**: スクリプトが例外を投げると呼び出し内の全変更がロールバックされる。`figma.group()` で親 Group の全子要素をまとめると親が即時削除される。非カレントページの `children.length` はロード前 0 を返す。Claude Code の auto mode では書き込み系 `use_figma` が分類器で拒否される（読み取りは通る）。ユーザーは Shift+Tab でモード切替して対応した。
- **Figma スクリーンショットは 0.5 倍で幅 376px**（PDF は 375px）になり端 1 列が半端画素。数値比較時は共通領域で切る。
- `sips --cropOffset` はオフセットを無視することがある。`tools/pngcrop.py` を使う。
- ユーザーはスキルや設定をグローバル（`~/.claude`）ではなくプロジェクト配下に置く方針（メモリ参照）。

## 成果物

- `docs/figma-artboards.md` — フレーム台帳・検証結果
- `docs/figma-scripts/01_split_artboards.js` — 分割スクリプト（実行済み）
- `docs/compare/pngdiff-2026-09-07.jsonl` — 9 面の差分数値
- `docs/figma-frames/` / `docs/pdf-pages/` / `docs/compare/` — 画像（約 31MB）
- `docs/figma-root-2-3-overview.png` — 分割前の全体俯瞰
- `docs/codex-review-2026-09-07.md` — Codex 監査
- `tools/pngdiff.py`, `tools/pngcrop.py`
- `ASSETS.md`, `assets/01_fv`〜`08_access`
- `haha.md` — 参考記事（Figma 忠実再現手法のノート。方針の出典。鵜呑みにしない点は Codex レビュー参照）

## 次のステップ

1. 9 フレームに `get_metadata`（`fileKey=otnVHe5ZRTTez8xxxHCo0A`）を実行し、結果を `docs/figma-meta/<frame>.xml` 等に保存（再取得しない）。PC-1 `14:6` → SP-1 `18:6` の順で、まず 1 面で試す。
2. メタデータからセクション境界（背景色・写真の切り替わり y）、CTA ボタン、FAQ 項目、ハンバーガーの矩形を抽出し、フレーム相対座標で `docs/sections.md`（または JSON）に台帳化。文字列は PDF から確認（Figma にテキストノードなし）。
3. PDF をセクション単位で画像化（`pdftoppm -r 72 -x -y -W -H` で切り出し、PC は 1920px 幅、SP は 750px 幅。必要なら 2 倍も）。`assets/` の写真原稿を直接使うかは要判断。
4. HTML/CSS 実装（画像積み上げ + CTA の当たり判定表示「リンク未設定」+ FAQ アコーディオン + ハンバーガーメニュー + Instructor 注記）。ブレークポイントはデザインに合わせて決める。
5. ブラウザスクリーンショットと PDF 画像を `tools/pngdiff.py` で比較し、1% 以下を目標に調整。数値と条件を記録。
6. ［要入力］の項目（タイトル・説明文、WordPress 連携、フォントライセンス）をユーザーに確認。

## その他のメモ

- Figma MCP ツール: `mcp__plugin_figma_figma__get_metadata` / `get_screenshot` / `use_figma`。`use_figma` の前に `figma:figma-use` スキルを必ず読む。`get_screenshot` は URL を返すので `curl -L -o` で保存。
- Codex は `codex exec ... - < prompt.md` で Bash から呼ぶ（メモリ `reference-codex-cli-usage`）。
- `docs/figma-frames/stray-2-8311.png` は 1×1 の透明画像（残置物の確認用）。
- プロジェクトは git 未初期化。バックアップは Figma のページ `4:2` のみ。
