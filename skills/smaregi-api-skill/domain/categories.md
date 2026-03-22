# 部門 (categories)

## 用途
部門（商品カテゴリ）情報の取得。部門別売上分析、商品の分類管理に使用。

## 重要フィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| categoryId | string | 部門ID（9桁以内） |
| categoryCode | string | 部門コード（20文字以内） |
| categoryName | string | 部門名（85文字以内） |
| categoryAbbr | string | 部門名略称 |
| level | string | 階層レベル（1〜3） |
| parentCategoryId | string | 親部門ID |
| categoryGroupId | string | 部門グループID |
| displayFlag | string | 端末表示フラグ |
| taxDivision | string | 税区分 |

## 階層構造

- 部門は最大3階層のツリー構造
- `level=1`: 大分類
- `level=2`: 中分類
- `level=3`: 小分類
- `parentCategoryId` で親部門を参照

## 税区分 (taxDivision)

| 値 | 意味 |
|----|------|
| 0 | 内税 |
| 1 | 外税 |
| 2 | 非課税 |

## 検索パラメータ

| パラメータ | 説明 |
|-----------|------|
| category_code | 部門コード |
| level | 階層レベル（1, 2, 3） |

## スコープ

- ⚠️ 部門APIのスコープは `pos.products:read` です（pos.categories ではない）

## 部門別売上の集計方法

1. 部門一覧を取得
2. 取引明細（with_details=all）を取得
3. 明細の `categoryId` ごとに金額を集計

- ⚠️ 取引明細の `categoryId` と `categoryName` は取引時点の情報が記録されています
