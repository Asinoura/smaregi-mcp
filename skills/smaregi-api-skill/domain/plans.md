# スマレジ プラン別API制約

## プラン一覧と利用可能API

| プラン | 取引 | 商品 | 店舗 | 在庫 | 会員 | 予算 | 精算 | 日次締め |
|--------|------|------|------|------|------|------|------|---------|
| スタンダード | ○ | ○ | ○ | ○ | × | ○ | ○ | ○ |
| プレミアム | ○ | ○ | ○ | ○ | × | ○ | ○ | ○ |
| プレミアムプラス | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| フードビジネス | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| リテールビジネス | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |

## 重要な制約

- ⚠️ 会員API (`/customers`) はプレミアムプラス・フードビジネス・リテールビジネスでのみ利用可能
- ⚠️ 在庫API (`/stock`) は全プランで利用可能です（以前の情報と異なります）
- ⚠️ 在庫管理仕様書のAPI（発注・入荷・出荷・棚卸等）はプレミアム以上が必要

## 必要なスコープ

| API | スコープ |
|-----|---------|
| 取引 (transactions) | pos.transactions:read |
| 商品 (products) | pos.products:read |
| 部門 (categories) | pos.products:read |
| 店舗 (stores) | pos.stores:read |
| 在庫 (stock) | pos.stock:read |
| 会員 (customers) | pos.customers:read |
| 予算 (budget) | pos.transactions:read |
| 精算 (adjustments) | pos.transactions:read |
| 日次締め (daily_summaries) | pos.transactions:read |
| 支払方法 (payment_methods) | pos.transactions:read |

## レート制限

- ⚠️ APIリクエストにはレート制限があります（プランにより異なる）
- ⚠️ 短時間に大量のリクエストを送ると 429 エラーが返されます
- ⚠️ 1分間に100リクエスト以上の連続呼び出しは避けてください
