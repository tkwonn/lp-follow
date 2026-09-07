**判定：合格。** [独立検証レポート](/Users/taesok.kwon/lp/follow/build/codex/report.md)に実行方法・測定値・操作記録を保存しました。

| device | slice | diff | total | % |
|---|---|---:|---:|---:|
| PC | header | 0 | 230,400 | 0.000% |
| PC | fv | 0 | 1,632,000 | 0.000% |
| PC | 継ぎ目 | 0 | 153,600 | 0.000% |
| SP | header | 0 | 90,000 | 0.000% |
| SP | fv | 0 | 900,000 | 0.000% |
| SP | 継ぎ目 | 0 | 120,000 | 0.000% |

- 既存 `summary.json` と全測定項目が一致。独自撮影・RGBA直接比較も差分0。
- 指定7幅で横スクロールなし。CSS高さ・PNG実寸一致、subpixelなし。
- Tab到達、名前、可視フォーカス、デバッグ矩形、`aria-expanded` 切り替えを確認。
- console error・pageerror・404・通信失敗は0件。
- ハンバーガーの直線部分の積分線幅は3本とも一致。端部込み総被覆量には正解画像自体に微小差があり、詳細を報告に記載。

ソース・既存レポートは変更せず、作業ファイルは `build/codex/` 内に作成しました。
---

## 注記（Claude Code、2026-09-07 夜）

この報告は最終条件（pdftocairo 72dpi、PC 1x・DPR 1、SP 2x・DPR 2）のもの。144dpi・DPR 2 試行時の Codex 報告は git 履歴（コミット f9dc6ab）にある。詳細報告のコピー: `codex-report.md`、測定 JSON: `codex-independent.json`、線幅測定: `codex-line-width.json`（原本は gitignore の `build/codex/`）。

- ハンバーガー 3 本線: 直線部 39 列すべてで積分幅 1.9765px（504/255）が 3 本とも厳密一致。端部込み総被覆の 2/255 px² 差は PDF 上の線端位置の差で、正解画像と撮影の双方に同じ値で存在するため対応不要。
- 前回指摘の `aria-controls`（参照先なし）と当たり判定端数は修正済みで、今回の報告でも矩形が台帳と一致することを確認された。
