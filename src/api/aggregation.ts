/**
 * APIレスポンスの配列に対して金額フィールドの合計・件数を自動計算する。
 * AIが個別レコードを合算する必要をなくし、正確な集計値を返す。
 */

export interface Aggregation {
  totalRecords: number;
  sums: Record<string, number>;
  note: string;
}

// 集計対象の金額フィールド（パターンマッチ）
const SUM_FIELD_PATTERNS = [
  "total",
  "subtotal",
  "amount",
  "tax",
  "taxInclude",
  "taxExclude",
  "price",
  "salesPrice",
  "cost",
  "costSum",
  "discount",
  "grossMargin",
  "cashSales",
  "creditSales",
  "pointDiscount",
  "unitDiscountedSum",
  "unitNonDiscountSum",
  "unitDiscountSum",
  "salesTotal",
  "totalExcludeTax",
  "costTotal",
  "nonSalesTargetTotal",
  "deposit",
  "returnDeposit",
  "receipt",
  "payment",
  "stockAmount",
  "layawayStockAmount",
  "preparationCash",
  "calculateBalance",
  "realBalance",
  "difference",
  "carriage",
  "commission",
  "saving",
  "salesTargetMonthly",
];

const SUM_FIELDS_SET = new Set(SUM_FIELD_PATTERNS);

/**
 * 配列データに対して集計メタデータを生成する。
 * 配列でない場合はnullを返す。
 */
export function computeAggregation(
  data: unknown,
  isPartialResult: boolean = false,
): Aggregation | null {
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const sums: Record<string, number> = {};
  const fieldsFound = new Set<string>();

  // 最初のレコードから集計対象フィールドを検出
  const firstRecord = data[0] as Record<string, unknown>;
  for (const key of Object.keys(firstRecord)) {
    if (SUM_FIELDS_SET.has(key)) {
      const val = firstRecord[key];
      if (typeof val === "string" || typeof val === "number") {
        const num = Number(val);
        if (!isNaN(num)) {
          fieldsFound.add(key);
        }
      }
    }
  }

  if (fieldsFound.size === 0) {
    return {
      totalRecords: data.length,
      sums: {},
      note: "集計対象の数値フィールドが見つかりませんでした。",
    };
  }

  // 全レコードの集計
  for (const record of data) {
    const rec = record as Record<string, unknown>;
    for (const field of fieldsFound) {
      const val = rec[field];
      if (val != null) {
        const num = Number(val);
        if (!isNaN(num)) {
          sums[field] = (sums[field] ?? 0) + num;
        }
      }
    }
  }

  // 小数点の丸め誤差を防ぐ（整数値の場合はそのまま）
  for (const key of Object.keys(sums)) {
    const val = sums[key]!;
    if (Number.isInteger(val)) {
      // そのまま
    } else {
      sums[key] = Math.round(val * 100) / 100;
    }
  }

  const note = isPartialResult
    ? "この集計は取得分のみです。全件ではない可能性があります。ページネーションで残りを取得してください。"
    : "この集計値はAPIレスポンス全件から計算済みです。AIが個別レコードを合算する必要はありません。";

  return {
    totalRecords: data.length,
    sums,
    note,
  };
}
