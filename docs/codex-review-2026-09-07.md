# Codex レビュー（2026-09-07）: Illustrator→Figma→実装ワークフロー

Claude Code からの相談プロンプトに対する Codex (codex-cli 0.153.4) の回答。原文ママ。

**推奨は「Illustratorから静的素材を直接書き出し、Figmaで配置・仕様を共有し、動的部分だけHTMLで実装」です。** SVGをFigmaに貼るだけで、記事が想定する編集可能な設計データが揃うとは限りません。

[CLAUDE.md](/Users/taesok.kwon/lp/follow/CLAUDE.md)、[haha.md](/Users/taesok.kwon/lp/follow/haha.md)、[ASSETS.md](/Users/taesok.kwon/lp/follow/ASSETS.md)を確認しました。Figma本体は取得できていないため、実際のノード構造は**要確認**です。PDF寸法・フォント数は提示情報を前提にしています。

**1. Illustrator → SVG → Figmaの受け渡し**

- **文字情報と見た目を分けて納品する。** アウトライン済みSVGは形状を保持できますが、元の文字列・フォント名・行間・字間は取り戻せません。非アウトラインAIを保管し、全文原稿と文字仕様表を併せて受け取ってください。
- **編集可能な文字が必要なら、非アウトラインSVGで小範囲を試験。** Figmaで本当に `TEXT` ノードになったか、文字列・フォント・改行が保持されたかを確認します。SVGにテキストが残っていても、取り込み後の保持は保証しない運用に。必要部分はFigmaのネイティブテキストとして作り直します。
- **フォントは正式名・ウェイト・バージョンまで指定。** 取り込み担当環境で利用できることを確認。PDFへの埋め込みは、Figmaでの編集やWebフォント配信を可能にするものではありません。
- **SVG推奨設定：** 画像は埋め込み、Object IDsはLayer Names、名前は一意で意味のあるものに。小数点はまず3〜4桁、細部が崩れる場合は増やす。検証時はMinifyをオフ、スタイルはPresentation Attributesを第一候補にします。これらは実務上の初期値であり、完全互換の保証ではありません。[Adobe公式の書き出し設定](https://helpx.adobe.com/fi/illustrator/using/exporting-artwork.html)
- **Responsiveは取り込み用ではオフを推奨。** 明示的な幅・高さと `viewBox` を保持します。このチェックはSVGのサイズ指定に関するもので、FigmaのAuto LayoutやPC/SP切り替えを生成しません。[Adobe公式](https://helpx.adobe.com/fi/illustrator/using/exporting-artwork.html)
- **ペーストより、保存したSVGファイルのドラッグ＆ドロップを標準手順に。** 同一素材を再現可能に取り込むためです。ペーストでもベクターになれば利用できますが、クリップボード経由で画像化されていないか確認。インポートだけで文字や構造の欠落が解決するわけではありません。
- **アートボードを使用してセクション単位に書き出す。** PC/SPで対応する名前・順序を付け、メニュー展開図は別管理。余白・背景・影・マスクの範囲を固定し、Figma側も基準幅のフレームで包みます。再取り込みではノードIDが変わる可能性があるため対応表も更新。
- **4096pxはベクターフレーム全体の高さ上限ではありません。** Figmaの画像取り込みでは長辺4096pxへの縮小があり、巨大なラスター画像やSVG内写真は解像度確認が必要です。27,500pxのLPを1枚のPNGにして取り込む方法は避けます。[Figma公式](https://help.figma.com/hc/en-us/articles/360040028034-Add-images-and-videos-to-designs)
- **最初に1セクションで合否判定。** 原寸寸法、文字、写真、グラデーション、クリッピング、ぼかし、透明度・描画モード、RGB/sRGBでの色を原稿と比較。SVG化でIllustrator固有表現が変わる箇所は、直接PNG化する方が確実です。

**2. Figma MCPとREST API**

| 必要なもの | 現行MCPでの扱い |
|---|---|
| ノードID・名前・種類・位置・サイズ | `get_metadata`。詳細な全属性JSONではない |
| 実装用の見た目・スタイル情報 | `get_design_context`。元ノードに存在する情報が前提 |
| Variables・Styles | `get_variable_defs`。取り込みSVGから自動的に設計トークンが復元されるわけではない |
| 確認画像 | `get_screenshot` |
| PDF・SVG・PNG等の素材 | **remoteの `download_assets` が対応** |
| `geometry=paths` と同じREST形式のノードJSON | 上記読み取りツールとは非同等。厳密に必要ならREST |

現行公式資料では、`download_assets` は最大20ノード、PDF/SVG等に対応します。ただし書き出し設定なし・1倍では長辺約4096pxの制限が記載されています。**実接続でツールが公開されているか、書き出し寸法は要確認**です。`use_figma` によるPlugin API経由の調査もありますが、REST JSONと同じ契約ではありません。[MCP公式ツール一覧](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)

- **PDF取得だけならPATは必須ではありません。** MCPの書き出し、手動書き出し、Illustrator直接出力で足ります。
- 記事どおりのノードJSONが必要な場合は、REST API＋PAT、または別途OAuth認証を用意します。MCPのOAuth接続を、そのまま任意のREST呼び出しに使えるとは扱いません。必要スコープは `file_content:read`。[REST公式](https://developers.figma.com/docs/rest-api/file-endpoints/)
- **2026年9月7日に確認したMCP公式上限：** Starterは最大20回/月、ProfessionalのView/Collabは最大6回/月、ProfessionalのDev/Fullは最大200回/日・10回/分。Professional契約だけでなく、席種と対象ファイルの所属先を確認してください。[MCP制限](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/)
- **RESTは別の制限体系。** `GET file nodes` と画像出力はどちらもTier 1なので、記事の「`geometry=paths` は制限対象外」は誤りです。現行表では低枠は最大20回/月ですが、同ページの説明文に6回/月も残っており、数値は**要確認**。429と `Retry-After` を優先し、保存・まとめ取り・手動出力で対処します。[REST制限](https://developers.figma.com/docs/rest-api/rate-limits/)

**3. このLPでの推奨構成と抜け漏れ**

- **正本を明文化する。** 「編集原本＝Illustrator」「見た目の基準＝承認済み直接出力」「配置・動作仕様＝Figma」を推奨します。Figmaを最終的な正解とするなら、Illustratorとの変換差分を解消・承認してから版を固定してください。
- **静的部分：Illustrator → セクション画像。** 写真や複雑な装飾はPNGを基準にWebP/AVIF等へ最適化。ロゴ・単純な装飾はアウトラインSVG。PDFは基準・代替書き出し用。すべての文字・paths取得はパターンBの必須条件ではありません。
- **FAQ：独立したHTMLセクション。** 質問・回答は実テキスト、装飾は画像。`details/summary` または見出し内button＋開閉状態管理を使用。初期状態、複数同時展開、回答全文、開閉時デザインは**要確認**です。[W3Cのアコーディオン仕様](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/)
- **ハンバーガー：実際の開閉UIとナビゲーション。** PC4ページ目・SP5ページ目はLP末尾に積みません。開閉button、リンク、Escape、閉じた後のフォーカス復帰を実装。モーダル表示なら背景操作・スクロール抑止も必要。固定ヘッダーかどうかは**要確認**。
- **Instructor：WordPressの編集対象を構造化。** 写真・名前・肩書・紹介文・表示順・公開状態をフィールド化し、カードをHTMLで出力。「セクション画像を差し替えるだけ」の意味か、各項目を編集する意味か、既存WP環境・接続方法は**要確認**。
- **動的部分以降をページ全体の固定Y座標にしない。** FAQ展開や講師紹介の増減で下部を自然に押し下げる構造に。透明CTAは各画像セクション内の相対座標で管理します。
- **フォントは動的部分だけWeb利用を検討。** 22種全部を配信する必要はありません。各フォントの画像利用・Web配信条件は**要確認**。Adobe Fontsの条件を、筑紫・モリサワ等の別契約に一括適用しないでください。[Adobe Fontsの利用条件](https://helpx.adobe.com/fonts/web/font-licensing/font-licensing.html)
- **寸法と接合条件を追記。** 提示値のPC本体合計は27,568px。PDFの単位はptなので、画像化時は目標ピクセル幅を明示します。SPの750pxは素材幅であり、CSS表示幅750pxと即断しないこと。ページ境界の重複・欠落、注記除去、ブレークポイント、中間幅、最大表示幅は**要確認**。
- **画質・速度・読み上げも受入条件に。** FVは優先読み込み、下部画像は遅延読み込み、画像寸法を予約。画像内本文の代替情報を用意し、巨大なalt一つに全文を詰めない。拡大時の可読性も確認します。

記事の「16,384pxが一律上限」「PDFが唯一の回避策」「1倍画像を2倍に拡大すれば高解像度」は採用しません。現行RESTには32メガピクセル超の縮小が明記されており、PC全体は約53メガピクセルです。セクション分割を基本にします。[REST出力仕様](https://developers.figma.com/docs/rest-api/file-endpoints/)

**4. リンク先・フォームがないCTA**

- **今回の推奨：透明リンクを置かず、プレビュー上で「リンク未設定」と明示。** 当たり判定の座標だけ保存しておきます。
- クリック確認が必要なら、**「デモです／リンク未設定です」と案内するbutton**にします。フォーム送信を示唆しないこと。
- 遷移先確定後に実URL付きの `a` に変更。ページ内移動なら実在する対象IDへのリンク。
- `href="#"`、空の `href`、`javascript:void(0)` はダミーとして使わない。`href`なしの `a` は機能するリンクではありません。
- 操作可能にする場合は、見えているCTA文言を含むアクセシブルな名前、明瞭なフォーカス表示、十分な操作領域、自然なTab順を設定します。

**5. Claude CodeとCodexの分担案**

- **Claude Code：実装担当。** セクション積み上げ、PC/SP切り替え、FAQ・メニュー、WP接続、CTA状態を実装。
- **Codex：素材・仕様監査と独立検証担当。** 書き出し寸法、素材対応、座標、画像差分、キーボード操作、開閉後のずれ、表示速度を確認。
- **共通の受け渡し台帳を使う。** 原稿版、ファイル名、ノードID、画像寸法・倍率、CTA矩形、動作、未確定事項を共有。Figma取得は担当を一本化し、両者で同じデータを再取得しない。
- **検証条件を固定する。** 表示幅・DPR・開閉状態・画像形式・差分指標を記録。「差分1%以下」だけで合格にせず、文字欠落や操作不良は別判定。同じファイルを同時編集しない運用にします。