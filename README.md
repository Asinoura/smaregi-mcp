# smaregi-mcp

スマレジ API を Claude Code から操作するための MCP サーバーと Skills。

商品管理・売上確認・在庫操作・会員管理・店舗設定など、スマレジの各種 API を Claude Code の会話から直接利用できます。

> **Note**: このプロジェクトはスマレジ株式会社の公式ツールではありません。[スマレジ Developer Platform](https://developers.smaregi.dev/) の公開 API 仕様をもとに作成した非公式の連携ツールです。

## 構成

```
smaregi-mcp/
├── MCP サーバー (src/, bin/)    ... APIを実際に叩く「手足」
└── Skills (skills/)             ... APIの使い方を知る「知識」
```

- **MCP サーバー**: 9つの汎用ツール（GET/POST/PUT/DELETE/PATCH + 管理系）を提供
- **Skills**: API リファレンス 63 ファイル + 操作ガイド 12 ファイル

## 対応 API

| API | Skills | MCP |
|-----|--------|-----|
| POS（商品・取引・会員・在庫・店舗等） | 対応 | 対応 |
| 在庫管理（ロス・発注・入荷・出荷・棚卸） | 対応 | 未対応 (*1) |
| ウェイター（メニュー・テーブル・注文・予約） | 対応 | 未対応 (*1) |
| 受注出荷（受注・出荷・決済） | 対応 | 未対応 (*1) |
| タイムカード（打刻・勤怠・給与・日報） | 対応 | 未対応 (*1) |

> *1: MCP サーバーのベースパスが `/pos` 固定のため。Skills のリファレンスは全 API 分を網羅済み。

## セットアップ

### 前提条件

- Node.js 18 以上
- Claude Code インストール済み
- スマレジ Developer Platform でアプリ作成済み（クライアント ID / シークレット取得済み）

### 1. Skills のインストール

```bash
npx smaregi-mcp setup-skills
```

`~/.claude/skills/smaregi-api-skill/` に API リファレンスと操作ガイドがインストールされます。

### 2. MCP サーバーの登録

`~/.claude/settings.json` の `mcpServers` に追加:

```json
{
  "mcpServers": {
    "smaregi": {
      "command": "npx",
      "args": ["smaregi-mcp"]
    }
  }
}
```

### 3. Claude Code を再起動

### 4. 認証設定

Claude Code の会話で:

```
スマレジの認証設定をして
```

契約 ID・クライアント ID・クライアントシークレットを入力すると `~/.config/smaregi-mcp/config.json` に保存されます。設定ディレクトリは `0700`、設定・トークンファイルは `0600` に自動矯正されます。

### 5. 動作確認

```
スマレジの店舗一覧を取得して
```

### ソースからビルドする場合

```bash
git clone https://github.com/Asinoura/smaregi-mcp.git
cd smaregi-mcp
npm install
npm run build
```

## MCP ツール一覧

| ツール | 説明 |
|-------|------|
| `smaregi_api_get` | GET リクエスト（データ取得） |
| `smaregi_api_post` | POST リクエスト（データ作成） |
| `smaregi_api_put` | PUT リクエスト（データ更新） |
| `smaregi_api_delete` | DELETE リクエスト（データ削除） |
| `smaregi_api_patch` | PATCH リクエスト（部分更新） |
| `smaregi_api_list_paths` | 利用可能なエンドポイント一覧 |
| `smaregi_configure` | 認証情報設定 |
| `smaregi_auth_status` | 認証状態確認 |
| `smaregi_server_info` | サーバー情報表示 |

## セキュリティ

- GETは既定で利用できますが、POST/PUT/PATCH/DELETEは既定で無効です。
- 変更系APIを使う場合だけ、MCPサーバーの環境変数へ `SMAREGI_ENABLE_MUTATIONS=true` を設定してください。
- 変更系ツールはさらに `confirm: true` が必須です。実行前に対象・件数・変更内容を確認してください。
- 必要最小限のスマレジScopeだけを付与し、本番用と検証用の認証情報を分けてください。
- 認証情報やトークン値は会話・ログ・Issueへ貼り付けないでください。

```json
{
  "mcpServers": {
    "smaregi": {
      "command": "npx",
      "args": ["smaregi-mcp"],
      "env": {
        "SMAREGI_ENABLE_MUTATIONS": "true"
      }
    }
  }
}
```

## Skills 構成

```
skills/smaregi-api-skill/
├── SKILL.md                    # スキル定義・全体目次
├── references/ (63 ファイル)    # API エンドポイント仕様書
│   ├── common-*                # 認証・Webhook
│   ├── pos-*                   # POS API
│   ├── inventory-*             # 在庫管理 API
│   ├── waiter-*                # ウェイター API
│   ├── order-*                 # 受注出荷 API
│   └── timecard-*              # タイムカード API
└── recipes/ (12 ファイル)       # 操作手順ガイド
    ├── product-operations.md   # 商品管理
    ├── transaction-operations.md # 取引操作
    ├── customer-operations.md  # 会員管理
    ├── stock-operations.md     # 在庫操作
    ├── store-operations.md     # 店舗管理
    ├── coupon-operations.md    # クーポン操作
    ├── inventory-management-operations.md # 在庫管理
    ├── waiter-operations.md    # ウェイター操作
    ├── order-management-operations.md     # 受注出荷操作
    ├── staff-timecard-operations.md       # タイムカード操作
    ├── webhook-setup.md        # Webhook 設定
    └── troubleshooting.md      # トラブルシューティング
```

## スマレジアプリの作成

1. [developers.smaregi.dev](https://developers.smaregi.dev) でアプリを新規登録（種別: Web アプリ）
2. 必要なスコープを有効化:
   - `pos.products:read` / `pos.products:write`
   - `pos.customers:read` / `pos.customers:write`
   - `pos.stores:read`
   - `pos.transactions:read` / `pos.transactions:write`
   - `pos.staffs:read`
   - `pos.stock:read` / `pos.stock:write`
3. クライアント ID / シークレットを控える

## トラブルシューティング

### MCP サーバーが認識されない

- `settings.json` のパスが正しいか確認
- Claude Code を再起動したか確認
- `node /path/to/bin/smaregi-mcp.js` を直接実行してエラーが出ないか確認

### 認証エラー (401)

- トークンキャッシュを削除: `rm ~/.config/smaregi-mcp/tokens.json`
- クライアント ID / シークレットが正しいか確認

### スコープ不足 (403)

- Developer Platform でアプリのスコープ設定を確認
- スコープ変更後はトークンキャッシュを削除: `rm ~/.config/smaregi-mcp/tokens.json`

### レート制限 (429)

| 環境 | GET | POST/PUT/PATCH/DELETE |
|------|-----|----------------------|
| サンドボックス | 10 回/秒 | 4 回/秒 |
| 本番 | 50 回/秒 | 20 回/秒 |

`Retry-After` ヘッダーの秒数だけ待ってから再試行してください。

## ライセンス

MIT
