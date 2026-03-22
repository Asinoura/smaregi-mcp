# 共通パターンと注意事項

## 純売上の集計パターン

正しいリクエスト:
```
GET /transactions?transaction_head_division=1&transaction_date_time-from=2024-01-01T00:00:00+09:00&transaction_date_time-to=2024-01-31T23:59:59+09:00
```
取得後、レスポンスの各取引で `cancelDivision=0` のもののみ `total` を合算する。

- ⚠️ 必ず `transaction_head_division=1`（通常取引）を指定すること
- ⚠️ 取得したデータのうち `cancelDivision` が `0` のもののみ集計すること
- ⚠️ 期間上限は31日間なので、1ヶ月単位なら1回のリクエストで取得可能

## 集計の正確性に関する重要ルール

- ⚠️ LLMが大量のJSONを数えたり合算したりする精度は低いことを前提にすること
- ⚠️ 件数が多い場合（100件以上）は合算をプログラムに任せるか、日次締め情報（daily_summaries）APIを使うこと
- ⚠️ daily_summaries は締め処理済みのデータのみ返すため、当日のリアルタイム売上は取引APIを使う必要がある
- ⚠️ 「売上合計」を求める場合、全ページのtotalフィールドを正確に合算すること（1ページ目だけでは不完全）

## 日次締め情報 (daily_summaries) の活用

日次の集計値が必要な場合、取引を1件ずつ集計するよりdaily_summariesを使う方が正確で効率的:
- `salesTotal` — 総売上
- `total` — 純売上
- `totalExcludeTax` — 純売上（税抜）
- `grossMargin` — 粗利益
- `transactionCount` — 取引数
- `amount` — 販売商品点数
- `cashSales` — 現金売上
- `creditSales` — クレジット売上

- ⚠️ daily_summariesは締め処理（status=2）済みのデータのみ取得可能
- ⚠️ limitの上限は100

## 前月比較の正しいやり方

1. 今月分: `transaction_date_time-from=今月1日` / `transaction_date_time-to=今月末日`
2. 前月分: `transaction_date_time-from=前月1日` / `transaction_date_time-to=前月末日`
3. 両方の結果を比較

または、daily_summariesで日別の集計値を取得して比較する方が効率的。

## 商品別売上ランキング

1. `with_details=all` で取引明細を取得（limit=100以下）
2. 明細の `productId` ごとに `unitDiscountedSum` を集計
3. 金額降順でソート

- ⚠️ 取引件数が多い場合、レスポンスが非常に大きくなります
- ⚠️ 期間を短く（1日〜1週間）して取得することを推奨
- ⚠️ 明細の `salesDivision=0`（売上対象）のみ集計すること

## 予実管理（予算 vs 実績）

1. 予算: `GET /budget/{store_id}?ym-from=YYYYMM&ym-to=YYYYMM` で月別予算を取得
2. 実績: daily_summaries または transactions で実売上を取得
3. 達成率 = 実績 / 予算 × 100

## 精算情報の活用

精算（adjustments）APIは日次の現金精算情報を提供:
- `cashSales` — 現金売上
- `calculateBalance` — 計算現金残高
- `realBalance` — 実現金残高
- `difference` — 現金過不足

- ⚠️ store_id は必須パラメータ
- ⚠️ 精算日、精算日時、精算日時範囲のいずれか1つが必須（相互排他）

## 期間分割の実装パターン

31日を超える期間のデータが必要な場合:
1. 開始日と終了日を受け取る
2. 31日ごとに分割
3. 各期間のリクエストを順次実行
4. 結果を結合

## 禁止パターン

- ⚠️ 全商品×全取引のクロス集計は禁止（レスポンスが巨大になりタイムアウトします）
- ⚠️ limit を指定せずに全件取得することは避けてください
- ⚠️ 1分間に100リクエスト以上の連続呼び出しは避けてください
- ⚠️ with_details=all で limit を100超にしないこと（エラーになる）

## ページネーション

- `limit`: 1回のリクエストで取得する件数
- `page`: ページ番号（1始まり）
- ⚠️ スマレジAPIは `offset` ではなく `page` でページネーションします
- ⚠️ 全件が必要な場合は、pageを1ずつ増やしながら繰り返しリクエストしてください
- ⚠️ 大量データ取得時は「取引明細一覧CSV作成API」の利用も検討してください

## 日付フォーマット

- 日時: ISO 8601 形式 `2024-01-01T00:00:00+09:00`
- 日付のみ: `YYYY-MM-DD` 形式（sum_date等）
- 年月: `YYYYMM` 形式（予算API）
- ⚠️ タイムゾーンは `+09:00`（日本時間）を指定してください

## パラメータ名の命名規則

- ⚠️ 範囲指定パラメータは**ハイフン区切り**: `transaction_date_time-from`（`_from` ではない）
- ⚠️ 複合語はアンダースコア区切り: `transaction_head_division`
- ⚠️ この混在に注意。AIが自動でアンダースコアに統一してしまうことがある
