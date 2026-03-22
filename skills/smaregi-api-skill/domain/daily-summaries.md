# 日次締め情報 (daily_summaries)

## 用途
日次の売上集計データを取得する。日次・月次の売上レポートに最適。
取引を1件ずつ集計するより正確で効率的。

- ⚠️ 締め処理（status=2）済みのデータのみ取得可能
- ⚠️ 当日のリアルタイム売上は取引API（transactions）を使うこと

## 重要な集計フィールド

### 売上関連
| フィールド | 説明 |
|-----------|------|
| salesTotal | 総売上 |
| total | 純売上 |
| totalExcludeTax | 純売上（税抜） |
| discount | 値引き合計 |
| pointDiscount | ポイント利用金額合計 |
| costTotal | 売上原価合計 |
| grossMargin | 粗利益合計 |

### 取引数・商品数
| フィールド | 説明 |
|-----------|------|
| transactionCount | 通常取引数 |
| amount | 販売商品点数 |
| returnAmount | 返品数 |

### 支払方法別
| フィールド | 説明 |
|-----------|------|
| cashSales | 現金売上額 |
| creditSales | クレジット売上額 |
| otherSalesList | その他支払方法リスト（配列） |

### 税金関連
| フィールド | 説明 |
|-----------|------|
| inTaxSalesTotal | 内税対象額合計 |
| taxInclude | 内税額合計 |
| outTaxSalesTotal | 外税対象額合計 |
| taxExclude | 外税額合計 |
| taxTotal | 消費税合計 |
| nonTaxSalesTotal | 非課税対象額合計 |
| taxFreeTotal | 免税額合計 |

### 現金管理
| フィールド | 説明 |
|-----------|------|
| preparationCash | 釣銭準備金 |
| calculateBalance | 計算現金残高 |
| realBalance | 実現金残高 |
| difference | 現金過不足 |

## 検索パラメータ

| パラメータ | 説明 | 注意 |
|-----------|------|------|
| sum_date | 締め日 | YYYY-MM-DD |
| store_id | 店舗ID | |
| cash_drawer_id | キャッシュドロアID | |

- ⚠️ limitの上限は100

## 活用パターン

### 月次売上レポート
```
GET /daily_summaries?store_id=1&sum_date-from=2024-01-01&sum_date-to=2024-01-31
```
→ 日別のsalesTotal, total, grossMarginを取得

### 店舗比較
各店舗のdaily_summariesを取得して比較

## よくある間違い

- ⚠️ 締め処理されていない日のデータは取得できない（status=2のみ）
- ⚠️ `totalExcludTax` は非推奨。`totalExcludeTax` を使うこと
- ⚠️ `otherSalseList` は非推奨。`otherSalesList` を使うこと（typo修正版）
