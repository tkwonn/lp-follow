# 単位 02 Codex 独立検証（暫定・2026-09-07 19:40）

**状態: 最終報告なし（Codex の OpenAI 利用上限）。独自検証の生データは取得済み。**

`sh tools/codex/verify.sh 02-menu`（gpt-6-astra）は 19:36 に開始し、独自の Playwright スクリプト `codex-independent.mjs`（原本 `build/codex/02-menu/`）で 134 項目を実行・記録（`codex-independent.json`）した直後、報告 Markdown を書く前に `You've hit your usage limit ... try again at 11:02 PM` で終了した（`build/codex/log-02-menu.txt` 末尾、exit 1）。**23:02 JST 以降に再実行し、本ファイルを Codex の正式報告で置き換える。**

## Codex が記録した結果（`codex-independent.json` を Claude Code が要約。Codex 自身の判定文ではない）

- `run.mjs --unit 02-menu --no-build --port 4199` の再実行結果は `summary.json` と全項目一致（`rerun devices exactly equal original`）。
- Codex 独自撮影の画素比較（pixelmatch threshold 0）: すべて 0 差。

| device | 撮影 | diff | total |
|---|---|---:|---:|
| PC | menu-element（開状態の展開図要素） | 0 | 1,920,000 |
| PC | viewport-open（1920×1000 全体） | 0 | 1,920,000 |
| PC | header / fv（開閉 3 回後） | 0 / 0 | 230,400 / 1,632,000 |
| SP | menu-element | 0 | 1,050,000 |
| SP | viewport-open（750×1400 device px） | 0 | 1,050,000 |
| SP | header / fv（開閉 3 回後） | 0 / 0 | 90,000 / 900,000 |

- OK（129 項目）: 閉状態の初期値／開くボタンに Tab で到達しアウトライン可視／開いて dialog・閉じるボタンにフォーカス・`main` inert／当たり判定 10 個の矩形・名前・不可視（PC/SP 各 30 項目）／ホイール・PageDown・ArrowDown でページが動かない／ヘッダー・FV の CSS 高さ／Tab 前進・Shift+Tab 後退の循環／メニュー内の全当たり判定にフォーカスアウトライン／Escape で閉じてフォーカス復帰／`overflow`・`padding-right` 復元／Enter・Space で開閉／「Top」クリックで閉じて `#top` へ移動／幅 1920・1366・1024・768・767・375・320 で開閉とも横スクロールなし／375×568 で層内のみスクロール（`menuY` 0→132、ページ y 0）・End キーでもページ不動／console error・pageerror・HTTP 4xx/5xx なし。
- NG と記録された 5 項目（Claude Code の分析）:
  1. `pc/sp debug 10 visible rectangles`: Codex スクリプトが `outline.includes('2px dashed')` で判定したが、Chromium の `getComputedStyle().outline` は `rgba(255, 0, 0, 0.8) dashed 2px` の順で返る。記録された 10 要素すべてが `dashed 2px` と背景 `rgba(255, 0, 0, 0.12)` を持っており、実装は正しい（判定式の文字列順の問題）。
  2. `reference / implementation / independent 3 equal hamburger strokes`: 端部込みの総被覆量（88.4196 / 88.4275 / 88.4275）を厳密等号で比較した。直線部の積分幅は 3 本とも同値で、正解画像と撮影の値が完全に一致している。単位 01 の Codex 報告で「PDF 上の線端位置の差、正解画像と撮影の双方に同じ値で存在するため対応不要」と結論済みの既知事項。

## 再実行手順

```
sh tools/codex/verify.sh 02-menu > build/codex/log-02-menu-2.txt 2>&1
```

完了後、`docs/verify/02-menu/codex.md` を Codex の出力で置き換え、詳細報告があれば `codex-report.md` にコピーする。
