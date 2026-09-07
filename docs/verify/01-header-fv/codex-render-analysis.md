[調査報告書](/Users/taesok.kwon/lp/follow/build/codex/render-analysis.md)を作成しました。測定値・比較画像・再現用スクリプトは `build/codex/` に保存しています。ソースは変更していません。

- **ハンバーガー:** Splash の stroke adjust が原因と対照実験で確認。
- **フォント:** 拡大による縁の広がりは確認。一律に太る原因は未確定。
- **影:** CMYK原因説を支持する結果なし。ICC指定も差分0でした。

なお、A案のSP画像1500pxをCSS375pxで画素等倍表示するには、**DPR 4** が必要です。