# 在庫 (stock)

## 用途
商品の在庫数量を取得する。欠品検出、在庫確認、棚卸データの参照に使用。

## 重要フィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| storeId | string | 店舗ID |
| productId | string | 商品ID |
| stockAmount | string | 現在在庫数 |
| layawayStockAmount | string | 取置き在庫数 |
| updDateTime | string | 最終更新日時 |

- ⚠️ 在庫データは在庫変動（売上・入荷・出荷・棚卸・ロス等）が発生して初めて作成されます
- ⚠️ 変動がない商品は在庫データが存在しない場合があります

## 検索パラメータ

| パラメータ | 説明 | 注意 |
|-----------|------|------|
| store_id | 店舗ID | UserAccessToken使用時は必須 |
| product_id | 商品ID | 15桁以内 |
| upd_date_time-from / -to | 更新日時範囲 | 最大31日間、ハイフン区切り |

## 在庫管理仕様書のAPI（プレミアム以上）

在庫の詳細管理には以下のAPIも利用可能:
- `/losses/` — ロス管理
- `/purchaseorders/` — 発注管理
- `/storage/` — 入荷管理
- `/shipments/` — 出荷管理
- `/receiving/` — 入庫管理
- `/shipping/` — 出庫管理
- `/stocktaking/` — 棚卸管理

## よくある間違い

- ⚠️ 在庫0の商品を「欠品」と判断する前に、そもそも在庫データが存在するか確認すること
- ⚠️ stockControlDivision=1（在庫管理しない）の商品は在庫データが存在しない
