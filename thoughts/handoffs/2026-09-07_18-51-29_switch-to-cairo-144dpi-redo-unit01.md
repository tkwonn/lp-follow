---
date: 2026-09-07T18:51:29+09:00
git_commit: 68e4e41
branch: master
status: complete
---

# Handoff: 正解画像を pdftocairo 144dpi（PC 2x）へ切り替える決定。単位 01 を新条件で再実装・再検証する

## タスク

FOLLOW LP を Figma／PDF デザインと画素差分 0.000% で再現する（`CLAUDE.md` 正本）。単位 01（ヘッダー + FV）は旧条件で 0.000% 合格・Codex 合格だったが、ユーザーレビューで 3 点の見た目の差が指摘され、原因分析の結果 **正解画像の作り方を変える**ことをユーザーが承認した（2026-09-07 18:50 頃）。

- [完了] 原因分析（Claude Code + Codex 独立分析）。`docs/verify/01-header-fv/render-analysis.md`、`docs/verify/01-header-fv/codex-render-analysis.md`
- [完了] ユーザー承認: **対策 A ＋ B** ＝ レンダラを `pdftocairo` に変更し、PC は 144dpi（幅 3840px）を CSS 幅 1920 に 2x 表示、PC の検証を DPR 2 にする。SP は 72dpi 750px のまま（既に 2x）だがレンダラは cairo に揃える
- [完了] `CLAUDE.md:45-46` に新条件を記録（**未コミット**）
- [作業中 → 次セッション] 新条件での単位 01 再実装・再検証・Codex 検証・再提出
- [未着手] 単位 02〜19（`thoughts/plans/2026-09-07_pixel-exact-implementation-plan.md` §5）

## 重要な参照資料

- `CLAUDE.md` — 正本。「再現度の基準」節の正解画像・比較条件が今回改定された
- `docs/verify/01-header-fv/render-analysis.md` — 3 症状の原因・測定値・対策比較。Codex 版は `codex-render-analysis.md`
- `thoughts/plans/2026-09-07_pixel-exact-implementation-plan.md` — 単位表と手順。§2 の表（pdftoppm 72dpi / PC DPR 1）は旧条件のまま。**更新が必要**

## 最近の変更

- `CLAUDE.md:45` 正解画像を `pdftocairo -png`、PC 144dpi / SP 72dpi に改定。`:46` PC 比較条件を DPR 2 に。DPR 1 は対象外と明記。根拠ファイルへの参照を追加
- 新規 `docs/verify/01-header-fv/render-analysis.md`（Claude Code の分析）、`docs/verify/01-header-fv/codex-render-analysis.md`（Codex 報告のコピー、原本 `build/codex/render-analysis.md`）
- コードは未変更。作業ツリーは上記 3 ファイルのみ差分（`git status`: M CLAUDE.md、?? 2 ファイル）。**コミットはユーザー指示待ちで行っていない**

## 学んだこと

- **ハンバーガー真ん中の線だけ太い原因**: PDF では 3 本とも 2.2pt ストローク（`2.2 w`、丸端、`S`）。poppler Splash（pdftoppm）は stroke adjust が `SplashOutputDev.cc` でハードコード有効で、72dpi では線の位相により 2px/3px/2px の全塗りに丸める（グレーの部分被覆行が出ない）。`-thinlinemode`、PDF の `/SA false` はいずれも無効。Codex が libpoppler を直接呼ぶ C++（`build/codex/stroke-control.cc`）で ON/OFF を実証。`pdftocairo` はスナップせず AA で描くので等幅。Splash 144dpi でも 4/4/4 で等幅になるが、格子スナップは残るため他の細線で再発しうる → cairo を採用。
- **フォントの太さ**: インク被覆率は Splash 72 / cairo 72 / Splash 288 / Figma スクリーンショットで同一（タグライン 8.11%、Codex 測定 10.536% vs 10.534%）。字形・ウェイトは一致。差は 1x ラスタを DPR 2 画面で 2 倍補間したことによる縁のぼけ（グレー画素約 4 倍、積分被覆は不変）。ユーザーの実機条件は未取得なので仮説扱い。
- **影が濃い**: 原因未確定。PDF は DeviceRGB のみで CMYK 変換説は否定（ICC 指定で全画素無変化）。PDF と Figma の同縮尺比較で平均輝度差 −0.32、影域画素比率ほぼ同一。Codex は ROI によって明暗が逆転することを確認。2x 化で縁のにじみは解消する見込みだが、再提出時にユーザーに具体箇所を確認する。
- **Splash 144dpi PNG を CSS 1920 / DPR 2 に置くと Chromium 撮影と差分 0**（Codex 実測）。cairo 144dpi PNG のブラウザ 0 差はまだ未測定（次セッションで確認）。
- 2x 化の容量: FV 1 枚 694KB → 1.73MB（約 2.5 倍）。PC 全体 18MB → 約 45MB 見込み。
- 手元の画像処理は `node_modules/sharp` が使える（PIL・ImageMagick・mutool・gs は無い）。`build/probe/crop.mjs`（切り出し・拡大）、`build/probe/shot_dpr2.mjs`（DPR 2 撮影）が再利用可。
- Codex（`codex exec -s danger-full-access`）の長い調査は 1 回約 20 分・出力はログファイルへ（`head` にパイプしない）。

## 成果物

- `docs/verify/01-header-fv/render-analysis.md`、`docs/verify/01-header-fv/codex-render-analysis.md`
- `CLAUDE.md`（改定、未コミット）
- `build/probe/*`（gitignore。比較用クロップ画像、測定スクリプト）、`build/codex/*`（Codex の証跡: `measurements.json`, `browser-results.json`, `control-on/off.json`, `stroke-control.cc`, `pc.svg`）

## 次のステップ

1. **切り出しツールを cairo 化**: `tools/pdf_slice.py:42` の `pdftoppm` を `pdftocairo -png` に置換（引数体系は同じ: `-r -f -l -x -y -W -H -singlefile`）。PC は `--scale=2`（144dpi）、SP は `--scale=1`。デバイス別 scale を `docs/slices.json` か CLI で指定できるようにする（`package.json` の `images` スクリプトも更新）。切り出し境界は整数のまま（2x では 2 倍して偶数）。
2. **Next.js 側**: `lib/design.ts:41-42` の `width/height` は PNG の実寸（PC は 3840 × 2h）にする。CSS は `width:100%` なので表示幅は変わらない。`components/Section.tsx` の `<img width/height>` はそのまま実寸で良い。`HitArea` の % 配置は設計 px 基準なので影響なし（要確認）。
3. **検証ハーネス**: `tools/verify/run.mjs:43` の PC を `dsf: 2` に。正解は `build/img/pc`（3840 幅）と device px 撮影を比較。継ぎ目帯 `SEAM * dsf` はそのまま動く。`summary.json` の `method` 文字列を新条件に更新。
4. `python3 tools/pdf_slice.py ...` で `build/img` と `public/img` を再生成 → `node tools/verify/run.mjs --unit 01-header-fv` → PC/SP とも差分 0 まで修正。cairo の PNG に alpha が付く場合は `pngjs` 比較で RGBA 一致になるか確認（`-transp` は使わない。白背景で描かれるはず）。
5. ハンバーガー 3 本線が等幅になったこと、タグライン・FV 文字・影が Retina 相当（DPR 2）で正しく見えることを `build/probe/shot_dpr2.mjs` 相当で目視確認し、`docs/verify/01-header-fv/` にクロップ画像を保存。
6. **Codex 独立検証**（`sh tools/codex/verify.sh 01-header-fv > build/codex/log-01.txt 2>&1`）。`tools/codex/verify-prompt.md:9-10` の「pdftoppm 72dpi」「PC DPR 1」を新条件に書き換えてから実行。
7. 計画書 §2 の表と §9 を新条件に更新。`docs/sections.md:1-10` 付近に正解条件の記述があれば合わせる。
8. コミット（例: "Switch reference renderer to pdftocairo, PC 2x; re-verify unit 01"）して単位 01 を再提出。提出時に影の具体箇所と表示環境（DPR・ブラウザ幅）をユーザーに確認する。承認後に単位 02（ハンバーガーメニュー。前回ハンドオフ `thoughts/handoffs/2026-09-07_18-21-26_unit01-header-fv-pixel-exact-nextjs.md` の次のステップ 2 を参照）へ。

## その他のメモ

- 検証ポート: ハーネス既定 4173、Codex は 4199 / 4198。`run.mjs --device pc|sp`、`--no-build` あり。
- Codex 報告の注意点: SP を 144dpi にした場合は DPR 2 で寸法不一致になる（1500 → 750 の縮小が入る）ため、SP は 72dpi 750px を維持する判断。
- Codex 報告の「影 ROI 比較」は背景・輪郭込み。影単独の合成モデルの同定はしていない。
- メニュー展開図（PC-Menu 1920×1000、SP-Menu 750×1400）も新条件で切り出し直す（単位 02 で使用）。
- ユーザーに戻るのは「単位の提出」と「割り込み」のみ。それ以外は自律的に進める（`CLAUDE.md` 進行ルール）。
