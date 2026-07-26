---
name: smaregi-api-skill
description: "スマレジ API を MCP 経由で操作するスキル。POS・在庫管理・ウェイター・受注出荷・タイムカードの全APIリファレンスと使い方ガイドを提供。商品管理・売上確認・在庫操作・会員管理・店舗設定・発注入荷・テーブル注文・打刻勤怠・受注出荷など、スマレジ関連の操作やAPI仕様を調べたいときに使う。"
---

# スマレジ API スキル

## 概要

smaregi-mcp（MCPサーバー）を通じてスマレジの全APIと連携。

> このリファレンスは [スマレジ Developer Platform](https://developers.smaregi.dev/) の公開 API 仕様をもとに作成した独自ドキュメントです。スマレジ株式会社との公式な提携関係はありません。

このスキルの役割:
- スマレジ API の詳細リファレンスを提供（POS・在庫管理・ウェイター・受注出荷・タイムカード）
- smaregi-mcp 使用ガイドと API 呼び出し例を提供

## セットアップ

### 認証設定

`smaregi_configure` ツールで契約ID・クライアントIDを設定。
クライアントシークレットはディスクへ保存せず、`SMAREGI_CLIENT_SECRET` 環境変数で設定する。
契約ID・クライアントIDも `SMAREGI_CONTRACT_ID`, `SMAREGI_CLIENT_ID` 環境変数で設定可能。

### 確認

Claude 再起動後、`smaregi_auth_status` ツールで認証状態を確認。

## リファレンス

API リファレンスが `references/` に含まれます（全63ファイル）。各リファレンスにはエンドポイント、パラメータ、リクエストボディ、レスポンスの詳細情報があります。

目的のAPIを探すには、`references/` ディレクトリ内のファイルをキーワード検索してください。

### 共通
- `common-authentication.md` - 認証（OAuth 2.0 Client Credentials）
- `common-webhooks.md` - Webhook

### POS API
- `pos-products.md` - 商品
- `pos-categories.md` - カテゴリ
- `pos-transactions.md` - 取引
- `pos-customers.md` - 会員
- `pos-customer-points.md` - ポイント
- `pos-stock.md` - 在庫
- `pos-stores.md` - 店舗
- `pos-staffs.md` - スタッフ
- `pos-payment-methods.md` - 支払方法
- `pos-coupons.md` - クーポン
- `pos-bargains.md` - セール
- `pos-layaways.md` - 取り置き
- `pos-terminals.md` - 端末
- `pos-daily-summaries.md` - 日次精算
- `pos-suppliers.md` - 仕入先
- `pos-roles.md` - 役割
- `pos-tax-rates.md` - 税率
- `pos-product-sets.md` - セット商品
- `pos-product-option-groups.md` - オプショングループ
- `pos-adjustments.md` - 精算
- `pos-divisions.md` - 販売区分
- `pos-discounts.md` - 割引区分
- `pos-receipt-provisoes.md` - レシート特記事項
- `pos-payment-method-groups.md` - 支払方法グループ
- `pos-store-divisions.md` - 店舗区分

### 在庫管理API
- `inventory-losses.md` - ロス
- `inventory-purchase-orders.md` - 発注
- `inventory-receiving.md` - 入荷
- `inventory-shipments.md` - 出荷
- `inventory-storage.md` - 入庫
- `inventory-shipping.md` - 出庫
- `inventory-stock-taking.md` - 棚卸

### ウェイターAPI
- `waiter-menus.md` - メニュー
- `waiter-categories.md` - カテゴリ
- `waiter-toppings.md` - トッピング
- `waiter-topping-groups.md` - トッピンググループ
- `waiter-table-uses.md` - テーブル利用
- `waiter-orders.md` - 注文
- `waiter-custom-orders.md` - カスタムオーダー
- `waiter-reservations.md` - 予約
- `waiter-printing.md` - 印刷
- `waiter-dashboard.md` - 営業状況

### 受注出荷API
- `order-orders.md` - 受注
- `order-stores.md` - 受注店舗
- `order-stock.md` - 在庫

### タイムカードAPI
- `timecard-staffs.md` - 従業員
- `timecard-staff-locations.md` - 従業員事業所
- `timecard-stores.md` - 事業所
- `timecard-shift-patterns.md` - 勤務パターン
- `timecard-roles.md` - 役割
- `timecard-staff-groups.md` - 従業員グループ
- `timecard-positions.md` - 役職
- `timecard-time-punches.md` - 打刻
- `timecard-attendance.md` - 勤怠
- `timecard-attendance-store.md` - 勤怠（事業所別）
- `timecard-attendance-staff.md` - 勤怠（従業員別）
- `timecard-salary.md` - 給与
- `timecard-daily-reports.md` - 日報
- `timecard-daily-report-tags.md` - 日報タグ
- `timecard-holidays.md` - 休暇
- `timecard-settings.md` - 設定

## 使い方

### MCP ツール

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
| `smaregi_server_info` | サーバー情報 |

### 基本的な使い方

```
// 商品一覧取得
smaregi_api_get({ "path": "/products", "query": { "limit": "100" } })

// 商品登録
smaregi_api_post({ "path": "/products", "body": { "productCode": "ABC001", "productName": "テスト商品", "price": 1000 } })
```

### URL構造

| API | ベースURL |
|-----|----------|
| POS API | `{apiHost}/{contractId}/pos{path}` |
| 在庫管理API | `{apiHost}/{contractId}/pos{path}` ※各リファレンスで要確認 |
| ウェイターAPI | `{apiHost}/{contractId}/waiter{path}` |
| 受注出荷API | `{apiHost}/{contractId}/order-shipment{path}` |
| タイムカードAPI | `{apiHost}/{contractId}/timecard{path}` |

各APIのベースパスは個別リファレンスを参照してください。

## API制約

- 読み取り: 1リクエスト最大1000件（limitパラメータ上限）
- レート制限: GET 50回/秒(本番) 10回/秒(サンドボックス), POST/PUT/PATCH/DELETE 20回/秒(本番) 4回/秒(サンドボックス)
- ページネーション: `limit` と `page` クエリパラメータ
- 日付範囲: 最大31日間（取引系エンドポイント）

## レシピ

操作ガイドが `recipes/` に含まれます（全12ファイル）:

### POS
- `product-operations.md` - 商品管理
- `transaction-operations.md` - 取引操作
- `customer-operations.md` - 会員管理
- `stock-operations.md` - 在庫操作
- `store-operations.md` - 店舗管理
- `coupon-operations.md` - クーポン操作

### 在庫管理
- `inventory-management-operations.md` - 在庫管理（ロス・発注・入荷・出荷・棚卸）

### ウェイター
- `waiter-operations.md` - ウェイター操作（テーブル・注文・予約・印刷）

### 受注出荷
- `order-management-operations.md` - 受注出荷操作（受注・出荷・決済）

### タイムカード
- `staff-timecard-operations.md` - タイムカード操作（打刻・勤怠・給与・日報・休暇）

### 共通
- `webhook-setup.md` - Webhook設定
- `troubleshooting.md` - トラブルシューティング
