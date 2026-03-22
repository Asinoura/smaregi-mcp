# smaregi-mcp

スマレジ Platform API を AI エージェントから利用するための MCP サーバーです。

## 特徴

- **6つのツール** — 認証・店舗管理・API検索・API実行をカバー
- **ドメイン知識の自動注入** — `search_tools` で検索すると、API の注意事項（cancelDivision の罠など）が自動的に返される
- **構造的バリデーション** — Zod スキーマでパラメータを検証し、不正な値やtypoを防止
- **レスポンス制御** — 大きすぎるレスポンスは自動的に要約

## ツール一覧

| ツール | 説明 |
|--------|------|
| `authenticate` | client_credentials でアクセストークンを取得 |
| `auth_status` | 認証状態（トークン有効期限）を確認 |
| `set_store` | 操作対象の店舗IDを設定 |
| `list_stores` | 契約内の店舗一覧を取得 |
| `search_tools` | キーワードでAPIエンドポイントを検索（ドメイン知識付き） |
| `execute` | スマレジAPIを実行（バリデーション付き） |

## セットアップ

```bash
pnpm install
pnpm build
```

## Claude Desktop で使う

`claude_desktop_config.json` に追加:

```json
{
  "mcpServers": {
    "smaregi": {
      "command": "node",
      "args": ["/path/to/smaregi-mcp/dist/server.js"]
    }
  }
}
```

## 環境変数

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `SMAREGI_ENV` | `production` で本番API（smaregi.jp）を使用 | 開発（smaregi.dev） |

## 使い方

1. `authenticate` でスマレジAPIに認証（client_id, client_secret, contract_id が必要）
2. `search_tools` で使いたいAPIを検索（例: 「売上」）
3. ドメイン知識を確認してから `execute` でAPIを実行

### 例: 今月の純売上を取得

```
1. search_tools → query: "売上"
   → transactions API のパラメータとドメイン知識が返る
   → ⚠️ cancel_division=0 が必要と案内される

2. execute → path: "/transactions", params: {
     "transaction_head_division": "1",
     "cancel_division": "0",
     "transaction_date_time-from": "2026-03-01T00:00:00+09:00",
     "transaction_date_time-to": "2026-03-22T23:59:59+09:00"
   }
```

## 開発

```bash
pnpm test        # テスト実行
pnpm test:watch  # テスト監視モード
pnpm build       # ビルド
```
