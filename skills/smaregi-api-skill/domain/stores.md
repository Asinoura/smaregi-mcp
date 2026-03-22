# 店舗 (stores)

## 用途
店舗情報の取得。多店舗比較、店舗設定の確認に使用。

## 重要フィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| storeId | string | 店舗ID |
| storeCode | string | 店舗コード（20文字以内） |
| storeName | string | 店舗名（85文字以内） |
| storeAbbr | string | 店舗名略称 |
| division | string | 店舗区分 |
| pauseFlag | string | 休止フラグ |
| sellDivision | string | 販売区分（内税/外税） |
| postCode | string | 郵便番号 |
| address | string | 住所 |
| phoneNumber | string | 電話番号 |

## 店舗区分 (division)

| 値 | 意味 |
|----|------|
| 1 | 通常店舗 |
| 2 | 倉庫 |

## 休止フラグ (pauseFlag)

| 値 | 意味 |
|----|------|
| 0 | 通常（営業中） |
| 1 | 休止 |

## 販売区分 (sellDivision)

| 値 | 意味 |
|----|------|
| 0 | 内税販売 |
| 1 | 外税販売 |

## 締め処理設定

| フィールド | 説明 |
|-----------|------|
| sumProcDivision | 締め方式: 0=手動, 1=自動 |
| sumDateChangeTime | 締め日付変更時間（HHMM形式） |
| sumRefColumn | 締め参照時間: 0=端末時間, 1=サーバー時間 |

- ⚠️ 締め日付変更時間は、何時をもって日次の区切りとするかを決める設定です
- ⚠️ この設定により、同じ取引でもsum_dateが変わることがあります

## 検索パラメータ

| パラメータ | 説明 |
|-----------|------|
| store_code | 店舗コード |
| division | 店舗区分（1=通常, 2=倉庫） |
| with_point_condition | ポイント設定付加（all/none） |
| with_receipt_print_info | レシート印刷情報付加（all/none） |

## よくある間違い

- ⚠️ 倉庫（division=2）を通常店舗と混同して売上比較に含めてしまう
- ⚠️ 休止中の店舗（pauseFlag=1）を集計に含めてしまう
