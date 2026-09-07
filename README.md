# follow LP

Next.js 16 / React 19。Vercel の Next.js ランタイムで Basic 認証を実行します。

## ローカル

`npm ci` 後、`.env.example` を `.env.local` にコピーして認証情報を設定し、`npm run dev` で起動します。既存の `.env.local` は上書きしないでください。

本番相当の確認は `npm run build` → `npm start`。静的書き出しや `out/` の配信では認証は動きません。

## Vercel へデプロイ

1. このディレクトリの変更と `public/img/`・`public/fonts/` を Git にコミットして push。
2. Vercel にリポジトリを Import。Root Directory は `package.json` のある場所（このリポジトリならルート、親の lp をリポジトリにする場合は `follow`）。
3. Framework Preset は **Next.js**、Node.js は **22.x**、Build Command は `npm run build`、Output Directory はデフォルトのまま（`out` を指定しない）。
4. Settings → Environment Variables に `BASIC_AUTH_USERNAME` と `BASIC_AUTH_PASSWORD` を登録。Production と Preview の両方を対象にする。
5. Deploy。環境変数を後から変更した場合は再デプロイ。

初期認証情報はローカルの `.env.local` に保存しています。Git / Vercel CLI のアップロード対象外です。Vercel に自動転送されないため、管理画面で値を登録してください。ユーザー名にコロンは使用できません。

`proxy.ts` が全パスを認証します。未認証・誤認証は 401、環境変数が未設定の場合は 503 で公開を止めます。認証には HTTPS を使用する Vercel の URL を利用してください。

## 配信ファイルと制作資料

- Git 管理対象：`app/`、`components/`、`lib/`、`public/img/`、`public/fonts/`、設定ファイル。`lib/slices.json` はビルドに必要な切り出し設定です。
- ローカル保持・Git 対象外：`assets/`、`design/`、`docs/`、`thoughts/`、`tools/`、検証結果、`public/compare/`。Vercel CLI でも `.vercelignore` で除外します。
- 既にコミットされた制作資料は今回の変更後のツリーから除外します。過去のコミット履歴は書き換えません。
- 切り出しを変更した場合、制作側の `docs/slices.json` と配信側の `lib/slices.json` を同期し、配信用画像も更新してください。

公式資料：[Next.js Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)、[Vercel 環境変数](https://vercel.com/docs/environment-variables)、[.vercelignore](https://vercel.com/docs/deployments/vercel-ignore)
