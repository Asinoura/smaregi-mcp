# 会員 (customers)

## 用途
会員情報の取得。顧客分析、会員別売上分析、ポイント管理に使用。

- ⚠️ プレミアムプラス・フードビジネス・リテールビジネスプランでのみ利用可能

## 重要フィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| customerId | string | 会員ID |
| customerCode | string | 会員コード |
| customerNo | string | 会員番号 |
| rank | string | 会員ランク |
| firstName | string | 名 |
| lastName | string | 姓 |
| sex | string | 性別 |
| birthDate | string | 生年月日 |
| lastComeDateTime | string | 最終来店日時 |
| entryDate | string | 入会日 |
| status | string | 会員状態 |
| note | string | 備考 |

## 性別 (sex)

| 値 | 意味 |
|----|------|
| 0 | 不明 |
| 1 | 男性 |
| 2 | 女性 |

## 会員状態 (status)

| 値 | 意味 |
|----|------|
| 0 | 利用可 |
| 1 | 利用停止 |
| 2 | 紛失 |
| 3 | 退会 |
| 4 | 名寄せ |

## 検索パラメータ

| パラメータ | 説明 |
|-----------|------|
| customer_code | 会員コード |
| customer_id-from / -to | 会員ID範囲 |
| customer_no | 会員番号 |
| upd_date_time-from / -to | 更新日時範囲（最大31日間） |

- ⚠️ 会員名での検索パラメータは存在しません

## 会員と取引の紐付け

- 取引データの `customerId` フィールドで会員を特定できます
- 取引検索パラメータ `customer_code` で会員コード指定の取引を取得可能

## よくある間違い

- ⚠️ スタンダード・プレミアムプランで会員APIを使おうとしてエラーになる
- ⚠️ status=3（退会）や4（名寄せ）の会員を集計に含めてしまう
