# 商品マスタ (products)

## 商品データの構造

- `productId` — 商品ID（一意）
- `productCode` — 商品コード（バーコードに対応）
- `productName` — 商品名
- `categoryId` — カテゴリID
- `departmentId` — 部門ID
- `price` — 販売価格（税抜）
- `cost` — 原価
- `taxDivision` — 税区分

## カテゴリと部門

- カテゴリ: 商品の分類（例: 飲料、食品）
- 部門: 会計上の区分（例: フード、ドリンク）
- ⚠️ カテゴリと部門は別の概念です。カテゴリは商品管理、部門は会計目的です

## 価格フィールド

- `price` — 税抜価格
- ⚠️ 税込価格は取引データ (transactions) の明細から取得してください
- `cost` — 原価（設定されている場合のみ）

## 検索

- `product_name` パラメータは部分一致で検索できます
- `product_code` パラメータは完全一致です
- ⚠️ 商品数が多い場合は `limit` と `offset` でページネーションしてください
