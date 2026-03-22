# 取引データ (transactions)

## 用途
売上データの取得・集計に使用する最重要エンドポイント。取引ヘッダと明細を取得できる。

## 取引区分 (transactionHeadDivision)

| 値 | 意味 | 説明 |
|----|------|------|
| 1 | 通常取引 | 通常の売上取引 |
| 2 | 返品 | 返品処理 |
| 3 | 取消 | 取消処理 |
| 4 | 預かり金 | 預かり金受領 |
| 5 | 預かり金返金 | 預かり金の返金 |
| 6 | 回数券 | 回数券取引 |
| 7 | 券売 | 券売取引 |
| 8 | 入金 | 入金処理 |
| 9 | 出金 | 出金処理 |
| 11 | 仮販売 | 仮販売取引 |
| 13 | 領収証発行 | 領収証の発行 |
| 14 | 取置き | 取置き取引 |
| 15 | 引取 | 取置き引取 |
| 16 | 領収証 | 領収証 |

- ⚠️ 公式APIでは値 1,2,3,4,5,6,7,8,9,11,13,14,15,16 が存在します（10,12は欠番）

## 取消区分 (cancelDivision)

| 値 | 意味 |
|----|------|
| 0 | 通常（取消されていない） |
| 1 | 取消済み |

## 締め区分 (sumDivision)

| 値 | 意味 |
|----|------|
| 0 | 未処理 |
| 1 | 精算済 |
| 2 | 締済 |

## 純売上の計算

- ⚠️ 純売上の集計には `transaction_head_division=1` AND `cancel_division=0` の**両方**が必要です
- ⚠️ cancel_division を指定しないと、取消済み取引も含まれ金額が正しくなりません
- ⚠️ transaction_head_division を指定しないと、返品・入金・出金なども含まれます
- ⚠️ 返品取引（transaction_head_division=2）は別の取引として記録されるため、純売上からは自動的に除外されます

## 金額フィールド

| フィールド | 説明 |
|-----------|------|
| subtotal | 小計（税込み前の商品合計） |
| total | 合計（税込、最終支払額）|
| taxInclude | 内税額 |
| taxExclude | 外税額 |

- ⚠️ 純売上金額は `total` フィールドの合計を使ってください
- ⚠️ subtotal と total の差分が税額です
- ⚠️ 内税店舗の場合 subtotal=total になることがあります

## 検索パラメータ（重要なもの）

| パラメータ | 説明 | 注意 |
|-----------|------|------|
| transaction_date_time-from | 取引日時FROM | ⚠️ ハイフン区切り（アンダースコアではない） |
| transaction_date_time-to | 取引日時TO | ⚠️ ハイフン区切り |
| transaction_head_division | 取引区分 | 純売上なら1を指定 |
| cancel_division | 取消区分 | 純売上なら0を指定（※検索パラメータとしては存在しないため、取得後にフィルタが必要な場合あり） |
| store_id | 店舗ID | 特定店舗に絞りたい場合 |
| sum_date | 締め日 | YYYY-MM-DD形式 |
| sum_date-from / sum_date-to | 締め日範囲 | 最大31日間 |
| with_details | 明細付加 | none/summary/all |
| with_deposit_others | その他支払方法 | all/none |

- ⚠️ 必須検索条件: transaction_date_time, terminal_tran_date_time, sum_date, upd_date_time のいずれかのfrom/toペアが必要

## 明細レベル (with_details)

| 値 | 内容 | 用途 | limit上限 |
|----|------|------|----------|
| none | 取引ヘッダのみ | 件数・合計金額の集計 | 1000 |
| summary | ヘッダ＋概要 | 日次集計 | 100 |
| all | ヘッダ＋全明細 | 商品別の売上分析 | 100 |

- ⚠️ `with_details=all` または `summary` の場合、limitは**100以下**に制限されます
- ⚠️ `with_details=all` はレスポンスが非常に大きくなります。商品別分析が不要なら `none` を使ってください

## 取引明細の重要フィールド (details)

| フィールド | 説明 |
|-----------|------|
| productId | 商品ID |
| productName | 商品名 |
| price | 商品単価 |
| salesPrice | 販売単価（値引き後） |
| quantity | 数量 |
| unitNonDiscountSum | 値引き前計（販売価格×数量） |
| unitDiscountedSum | 値引き後計 |
| costSum | 原価計 |
| categoryId | 部門ID |
| transactionDetailDivision | 明細区分: 1=通常, 2=返品, 3=部門売り |
| salesDivision | 売上区分: 0=対象, 1=対象外 |
| taxDivision | 税区分: 0=税込, 1=税抜, 2=非課税 |

- ⚠️ 商品別売上を集計する際は `salesDivision=0`（売上対象）の明細のみ合算すること
- ⚠️ 値引き後の金額は `unitDiscountedSum` を使用すること（`price * quantity` ではない）

## 期間制限

- ⚠️ 1回のリクエストで取得できる期間上限は **31日間** です
- ⚠️ 31日を超える期間のデータが必要な場合は、月ごとに分割してリクエストしてください
- 例: 3ヶ月分 → 1月、2月、3月の3回に分けてリクエスト

## ページネーション

- `limit`: 1回のリクエストで取得する件数（with_details=none時は最大1000、all/summary時は最大100）
- `page`: ページ番号（1始まり）
- ⚠️ offsetではなくpageでページネーションします

## 日付フォーマット

- ISO 8601 形式: `2024-01-01T00:00:00+09:00`
- ⚠️ タイムゾーンは `+09:00`（日本時間）を指定してください
- 締め日(sum_date)のみ `YYYY-MM-DD` 形式

## よくある間違い

- ⚠️ パラメータ名のハイフンとアンダースコアを間違える（正: `transaction_date_time-from`、誤: `transaction_date_time_from`）
- ⚠️ cancel_divisionを指定し忘れて取消済み取引を含めてしまう
- ⚠️ with_details=all で limit を100超にしてエラーになる
- ⚠️ 期間指定なしでリクエストしてエラーになる（必須検索条件）
- ⚠️ LLMが大量のJSON配列を合算する精度は低い。件数が多い場合はページネーションで全件取得し、プログラムで合算すること
