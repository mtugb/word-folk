# Wordfolk

英単語・句動詞学習アプリ。仕様は [PLAN.md](./PLAN.md) を参照。

Bunのワークスペースで構成されている:

- `apps/web` — フロントエンド (Bun.serve + React)
- `apps/api` — API (Elysia + Drizzle/SQLite)
- `packages/core` — パース・identicon等の共有ロジック

## 開発

```bash
bun install
```

初回のみWordNetデータを取得（`apps/api/wordnet/`に約144MBのSQLiteを配置。無くても動くが接続語のWordNet裏取りが働かない）:

```bash
cd apps/api && bun run setup:wordnet
```

`apps/api/.env` と `apps/web/.env` を用意（下記「環境変数」参照）。それぞれ別ターミナルで起動:

```bash
cd apps/api && bun run dev   # http://localhost:3211
cd apps/web && bun run dev   # http://localhost:3210
```

DBマイグレーションは`apps/api`起動時に自動実行される（手動migrate不要）。

## 環境変数

`apps/api/.env`

| 変数 | 必須 | 内容 |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | 接続語生成に使うGemini APIキー |
| `API_TOKEN` | ✅ | APIへのアクセストークン（任意の文字列） |
| `DATABASE_PATH` | - | SQLiteファイルのパス（デフォルト: `wordfolk.sqlite`） |
| `WORDNET_DB_PATH` | - | WordNet SQLiteのパス（デフォルト: `wordnet/oewn.sqlite`） |

`apps/web/.env`

| 変数 | 必須 | 内容 |
|---|---|---|
| `PUBLIC_API_TOKEN` | ✅ | `apps/api`の`API_TOKEN`と同じ値 |
| `PUBLIC_API_URL` | 本番のみ | 例: `https://your-domain.com/api`。未設定時はローカルの`:3211`を見る |

## デプロイ (VPS)

```bash
git clone git@github.com:mtugb/word-folk.git
cd word-folk
bun install

# apps/api/.env, apps/web/.env を用意（上記参照）

cd apps/api && bun run setup:wordnet && cd ../..

pm2 start ecosystem.config.js   # web(3210) / api(3211) を起動
```

nginxは [`deploy/nginx/wordfolk.conf.example`](./deploy/nginx/wordfolk.conf.example) を参照。`your-domain.com`を書き換えて`/etc/nginx/sites-available/`に配置し、`certbot --nginx`でHTTPS化する。
