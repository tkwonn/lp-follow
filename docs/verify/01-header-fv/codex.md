**判定：合格（01-header-fv）**

| device | slice | diff | total | % |
|---|---|---:|---:|---:|
| PC DPR2 | header | 0 | 921,600 | 0.000% |
| PC DPR2 | fv | 0 | 6,528,000 | 0.000% |
| PC DPR2 | 継ぎ目 | 0 | 614,400 | 0.000% |
| SP DPR2 | header | 0 | 90,000 | 0.000% |
| SP DPR2 | fv | 0 | 900,000 | 0.000% |
| SP DPR2 | 継ぎ目 | 0 | 120,000 | 0.000% |

再実行結果は元の `summary.json` と一致。既存撮影・独自撮影とも正解 PNG と RGBA 値まで一致しました。

- 指定 7 幅で横スクロールなし。
- CSS 高さ・device px サイズは期待値と一致。
- ハンバーガーの太さは 3 本とも 4 device px。
- 名前・Tab 到達・可視フォーカス・debug 表示・`aria-expanded` 切り替えを確認。
- console error・404 は 0 件。

旧条件が残る計画書、未存在の `aria-controls` 参照先、当たり判定の微小な端数を注記しました。また、検証中に資料 2 件の内容変化を検出しましたが、私の処理では変更していません。

[詳細報告・再現手順・証跡](/Users/taesok.kwon/lp/follow/build/codex/unit01/report.md)
---

## 指摘への対応（Claude Code、2026-09-07）

詳細報告のコピー: `codex-report.md`、独自測定: `codex-independent.json`（原本は gitignore の `build/codex/unit01/`）。

1. 計画書の旧基準 → §2 表・§4・§9 を新条件（pdftocairo、PC 144dpi・DPR 2）に更新済み。Codex が検出した `docs/sections.md`・`render-analysis.md` の変化は、検証と並行して行った Claude Code の追記（新条件の注記・結果）。
2. `aria-controls="site-menu"` の参照先なし → `components/Menu.tsx` から `aria-controls` を外した。メニュー要素を実装する単位 02 で付け直す。
3. 当たり判定の端数（PC 高さ 75.984375、SP 左 319.984375 / 高さ 39.984375）→ `lib/design.ts` の `pct` を `calc(100% * v / base)` にし、`app/globals.css` の `.hit` で `round(nearest, …, 0.0625px)` に丸める（非対応ブラウザは丸めなしにフォールバック）。再測定（`getBoundingClientRect`）: PC 1920 `(1440, 24, 72, 76)`、SP 375 `(320, 12, 48, 40)` で台帳と一致。修正後の `run.mjs` 再実行も PC/SP とも差分 0（summary.json 更新）。
