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

- **MCP サーバー**: 9つの汎用ツール（GET/POST/PUT/DELETE/PATCH + 管理系）を提供。変更系（POST/PUT/DELETE/PATCH）は既定で無効で、明示的に有効にしたときだけ使えます（[セキュリティ](#セキュリティ)）
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

クライアントシークレットはファイルへ保存せず、MCPサーバーを起動する環境で設定します。

```bash
export SMAREGI_CLIENT_SECRET="..."
```

Claude Code の会話で:

```
スマレジの認証設定をして
```

契約 ID・クライアント IDを入力すると、公開情報だけが `~/.config/smaregi-mcp/config.json` に保存されます。設定ディレクトリは `0700`、設定・トークンファイルは `0600` に自動矯正され、アクセストークンの値や断片は状態表示へ出しません。

接続先は既定でサンドボックス（`id.smaregi.dev` / `api.smaregi.dev`）です。本番に接続するときは、MCPサーバーを起動する環境で `SMAREGI_IDP_HOST=https://id.smaregi.jp` と `SMAREGI_API_HOST=https://api.smaregi.jp` を設定します。以前の版で `smaregi_configure` を実行した場合は、`config.json` にサンドボックスの接続先が書き込まれていて、環境変数より優先されます。環境変数を設定したうえで `smaregi_configure` をもう一度実行してください（今の接続先は `smaregi_auth_status` の IDP Host・API Host で確かめられます）。契約 ID・クライアント ID・接続先・スコープのどれかが変わると、保存済みのトークンは使わずに取り直します。

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
| `smaregi_api_post` | POST リクエスト（データ作成）※ |
| `smaregi_api_put` | PUT リクエスト（データ更新）※ |
| `smaregi_api_delete` | DELETE リクエスト（データ削除）※ |
| `smaregi_api_patch` | PATCH リクエスト（部分更新）※ |
| `smaregi_api_list_paths` | 利用可能なエンドポイント一覧 |
| `smaregi_configure` | 契約ID・クライアントID設定（シークレットは環境変数のみ） |
| `smaregi_auth_status` | 認証状態確認 |
| `smaregi_server_info` | サーバー情報表示（変更系ツールが有効かどうかも表示） |

※ `SMAREGI_ENABLE_MUTATIONS=true` のときだけ登録されます。設定していなければ、ツール一覧にも出ません。

## セキュリティ

- 既定では読み取り専用です。GET（`smaregi_api_get`）は使えますが、POST/PUT/PATCH/DELETE のツールは登録されず、Claude からは見えません。
- トークンを取るときに要求するスコープも、既定では読み取り（`:read`）だけです。以前の版で `config.json` に書き込みスコープ（`:write`）が書かれていても、変更系を有効にしていなければ要求しません。
- 変更系APIを使う場合だけ、MCPサーバーの環境変数へ `SMAREGI_ENABLE_MUTATIONS=true` を設定してください（`1` などほかの値では有効になりません）。このとき変更系ツールが登録され、書き込みスコープ（`pos.products:write` など）も要求します。
- 変更系ツールはさらに `confirm: true` が必須です。実行前に対象・件数・変更内容を確認してください。
- 商品名や会員メモなど、スマレジから読んだデータの中に「削除して」のような指示が紛れ込んでいても、Claude が従ってしまうことがあります。変更系は必要なときだけ有効にし、終わったら外してください。
- API パスは `/products` のような `/` から始まるパスだけを受け付けます。`..`・`//`・`?`・`#` などで `/{契約ID}/pos` の外を指すパスは拒否します。クエリは `query` で渡してください。
- スマレジのエラー応答は、トークンらしい値を伏せ、500 文字までに切り詰めてから表示します。スマレジへの通信は 30 秒で打ち切ります。
- 設定・トークンファイル（`~/.config/smaregi-mcp/` の下）がシンボリックリンクのときは、リンク先を上書きしないよう書き込みを拒否します。
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

### 以前の版から更新する場合（互換性に影響する変更）

- 変更系ツール（`smaregi_api_post` / `put` / `delete` / `patch`）は、`SMAREGI_ENABLE_MUTATIONS=true` を設定していないと登録されなくなりました。以前は登録だけされて、呼ぶとエラーになっていました。
- 既定のスコープが読み取りだけになりました。`SMAREGI_ENABLE_MUTATIONS=true` を設定していない場合、`config.json` に書き込みスコープがあっても要求しません。スコープが変わるので、更新後の最初の呼び出しでトークンを取り直します。
- `..` や `//`、`?`・`#` を含む API パスは拒否するようになりました。クエリを `path` に書いていた場合は `query` に移してください。
- 契約IDは URL に入れるときにエンコードするようになりました。英数字と `_`・`-` だけの通常の契約IDには影響しません。
- テストUI（`test-ui/`）から、ツールを名前で直接呼ぶ `/api/call` をなくしました。画面からは使っていません。テストUIは読み取り専用で、起動した環境で `SMAREGI_ENABLE_MUTATIONS=true` を設定していても MCP サーバーには引き継ぎません。

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
2. 必要なスコープを有効化（読み取りだけで使うなら `:read` だけで足ります）:
   - `pos.products:read`
   - `pos.customers:read`
   - `pos.stores:read`
   - `pos.transactions:read`
   - `pos.staffs:read`
   - `pos.stock:read`
   - 変更系（`SMAREGI_ENABLE_MUTATIONS=true`）も使う場合だけ: `pos.products:write` / `pos.customers:write` / `pos.transactions:write` / `pos.stock:write`
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

- POST/PUT/PATCH/DELETE で 403 になる場合は、`SMAREGI_ENABLE_MUTATIONS=true` を設定しているか（`smaregi_server_info` で確認できます）と、アプリに書き込みスコープがあるかを確認
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
