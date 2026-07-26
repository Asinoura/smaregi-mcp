# トラブルシューティング

## 概要

スマレジAPI利用時によく発生するエラーとその対処法。

## 認証エラー

### 401 Unauthorized - トークンが無効

**症状**: APIリクエストが401エラーを返す

**原因と対処**:
1. トークンの有効期限切れ → `smaregi_auth_status` で確認し、再認証
2. トークンが設定されていない → `smaregi_configure` で契約ID・クライアントIDを設定
3. `SMAREGI_CLIENT_SECRET` が未設定または不正 → MCPサーバーの起動環境と管理画面で確認

```
// 認証状態を確認
smaregi_auth_status()

// 再設定
smaregi_configure({ "contract_id": "xxx", "client_id": "yyy" })
```

### 403 Forbidden - 権限不足

**症状**: APIリクエストが403エラーを返す

**原因と対処**:
1. スコープ不足 → 必要なスコープを確認し、トークンを再取得
2. アプリに権限が付与されていない → スマレジ管理画面でアプリの権限設定を確認

**よく必要なスコープ**:
| 操作 | 必要なスコープ |
|------|--------------|
| 商品取得 | pos.products:read |
| 商品登録・更新 | pos.products:write |
| 取引取得 | pos.transactions:read |
| 会員取得 | pos.customers:read |
| 会員登録・更新 | pos.customers:write |
| 在庫取得 | pos.stock:read |
| 在庫更新 | pos.stock:write |
| 店舗取得 | pos.stores:read |
| スタッフ取得 | pos.staffs:read |

## レート制限

### 429 Too Many Requests

**症状**: APIリクエストが429エラーを返す

**原因**: レート制限超過

**レート制限値**:
| カテゴリ | サンドボックス | 本番 |
|---------|--------------|------|
| GET | 10回/秒 | 50回/秒 |
| POST/PUT/PATCH/DELETE | 4回/秒 | 20回/秒 |

**対処**:
1. `Retry-After` ヘッダーの値（秒）だけ待ってから再試行
2. エクスポネンシャルバックオフを実装
3. 大量データ取得時はリクエスト間隔を空ける
4. トークンを毎回取得していないか確認（キャッシュ推奨）

## ページネーション

### データが全件取得できない

**症状**: 一部のデータしか返ってこない

**原因**: limitのデフォルトは100件

**対処**:
```
// limit を明示的に指定
smaregi_api_get({ "path": "/products", "query": { "limit": "1000", "page": "1" } })

// レスポンスの件数が limit と同じ場合、次のページがある
smaregi_api_get({ "path": "/products", "query": { "limit": "1000", "page": "2" } })
```

**判定方法**: レスポンスの配列の長さが limit 未満であれば最終ページ。

### 取引取得で日付指定が必要

**症状**: 取引一覧取得で400エラー

**原因**: 日付範囲パラメータが未指定

**対処**: 以下のいずれかの日付範囲を指定する:
- `transaction_date_time-from` / `to`
- `terminal_tran_date_time-from` / `to`
- `sum_date-from` / `to`
- `upd_date_time-from` / `to`

日付範囲は最大31日間。

## よくあるミス

### パスの先頭スラッシュ忘れ

```
// ✗ 誤り
smaregi_api_get({ "path": "products" })

// ○ 正しい
smaregi_api_get({ "path": "/products" })
```

### 数値を文字列で指定していない

スマレジAPIの多くのフィールドは文字列型。数値を文字列として渡す。

```
// ✗ 数値型で指定するとエラーになる場合がある
{ "price": 1000 }

// ○ 文字列型で指定
{ "price": "1000" }
```

### 更新時にPUTとPATCHを間違える

- **PATCH**: 部分更新（指定したフィールドのみ更新）→ 推奨
- **PUT**: 全体更新（未指定フィールドがデフォルト値にリセットされる可能性）

```
// 推奨: PATCHで部分更新
smaregi_api_patch({ "path": "/products/12345", "body": { "price": "1500" } })
```

### サンドボックスと本番の環境違い

| 項目 | サンドボックス | 本番 |
|------|--------------|------|
| API Host | api.smaregi.dev | api.smaregi.jp |
| IDP Host | id.smaregi.dev | id.smaregi.jp |
| レート制限 | GET 10/秒, 書込 4/秒 | GET 50/秒, 書込 20/秒 |
| データ | テストデータ | 実データ |

### 日時フォーマットの間違い

スマレジAPIの日時フォーマットは `YYYY-MM-DDThh:mm:ssTZD`。

```
// ○ 正しい
"2026-03-27T00:00:00+09:00"

// ✗ タイムゾーンなし
"2026-03-27T00:00:00"

// ✗ 日付のみ（エンドポイントによっては可）
"2026-03-27"
```
