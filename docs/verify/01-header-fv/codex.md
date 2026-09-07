**判定：合格（ユニット 01-header-fv）**

| device | slice | diff | total | % |
|---|---|---:|---:|---:|
| PC | header | 0 | 230,400 | 0.000% |
| PC | fv | 0 | 1,632,000 | 0.000% |
| PC | header–fv 継ぎ目 | 0 | 153,600 | 0.000% |
| SP | header | 0 | 90,000 | 0.000% |
| SP | fv | 0 | 900,000 | 0.000% |
| SP | header–fv 継ぎ目 | 0 | 120,000 | 0.000% |

既存 `summary.json` と再測定結果は、サイズ・subpixel・横スクロール・console error を含め一致しました。実装側画像と独自撮影画像も、正解との RGBA 相違画素は **0 個**でした。

- 指定の 7 幅すべてで `scrollWidth = clientWidth`。
- 高さは PC 120／850、SP 60／600 CSS px で定義どおり。
- PC/SP とも「メニューを開く」ボタンへ Tab で到達し、青いアウトラインを目視確認。
- 通常時は透明、`?debug=1` では赤い矩形を確認。
- Enter・Space・クリックで `aria-expanded` が切り替わる。
- console error・pageerror・404・通信失敗は 0 件。

非阻害の指摘として、`aria-controls` の参照先が未実装であることと、透明な当たり判定に最大 0.015625 CSS px の丸めを確認しました。再現手順は報告書に記載しています。

元の記録を保持するため、指定スクリプトは同一内容の隔離コピーで実行しました。ソース・既存検証記録の変更はありません。

[検証報告書・証跡](/Users/taesok.kwon/lp/follow/build/codex/report.md)