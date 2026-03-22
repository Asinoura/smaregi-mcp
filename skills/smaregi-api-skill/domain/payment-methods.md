# 支払方法 (payment_methods)

## 用途
決済方法の一覧取得。決済方法別の売上分析、支払方法の設定確認に使用。

## 重要フィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| paymentMethodId | string | 支払方法ID |
| paymentMethodCode | string | コード（20文字以内） |
| paymentMethodName | string | 名前（85文字以内） |
| changeFlag | string | お釣り対応 |
| paymentMethodGroupId | string | 分類ID |
| securitiesFlag | string | 商品券フラグ |
| isAvailable | boolean | API利用可能フラグ |

## お釣り対応 (changeFlag)

| 値 | 意味 |
|----|------|
| 0 | お釣りなし |
| 1 | お釣りあり |

## 商品券フラグ (securitiesFlag)

| 値 | 意味 |
|----|------|
| 0 | 商品券以外 |
| 1 | 商品券 |

## 検索パラメータ

| パラメータ | 説明 |
|-----------|------|
| payment_method_code | コードで絞り込み |
| display_flag | 表示フラグ（0=非表示, 1=表示） |
| change_flag | お釣り対応（0=なし, 1=あり） |
| payment_method_group_id | 分類IDで絞り込み |
| securities_flag | 商品券フラグ（0=以外, 1=商品券） |
| payment_methods_scope | all=外部連携含む, registered=登録済みのみ（デフォルト） |

## 決済方法別売上の取得方法

取引データの `depositOthers`（with_deposit_others=all指定時）に支払方法別の情報が含まれる。
または、daily_summariesの `cashSales`, `creditSales`, `otherSalesList` で日次集計値を取得。

## よくある間違い

- ⚠️ payment_methods_scope=all で取得した外部連携の支払方法はAPIから編集不可
