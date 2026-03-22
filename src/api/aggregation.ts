/**
 * APIレスポンスの配列に対して金額フィールドの合計・件数を自動計算する。
 * AIが個別レコードを合算する必要をなくし、正確な集計値を返す。
 *
 * 取引データの場合: cancelDivision="0" のレコードのみ集計する（取消済み除外）。
 */

export interface Aggregation {
  totalRecords: number;
  filteredRecords?: number;
  sums: Record<string, number>;
  excludedCancelledCount?: number;
  note: string;
}

// 集計対象の金額フィールド
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
 * 取引データかどうか判定し、取消済みレコードを除外する。
 * cancelDivision フィールドが存在するレコードは取引データとみなす。
 */
function filterCancelledTransactions(
  data: Record<string, unknown>[],
): { filtered: Record<string, unknown>[]; cancelledCount: number } {
  const first = data[0];
  if (!first || !("cancelDivision" in first)) {
    // cancelDivision がないデータはフィルタ不要
    return { filtered: data, cancelledCount: 0 };
  }

  const filtered: Record<string, unknown>[] = [];
  let cancelledCount = 0;

  for (const record of data) {
    if (record.cancelDivision === "1") {
      cancelledCount++;
    } else {
      filtered.push(record);
    }
  }

  return { filtered, cancelledCount };
}

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

  const rawRecords = data as Record<string, unknown>[];

  // 取消済み取引を自動除外
  const { filtered, cancelledCount } = filterCancelledTransactions(rawRecords);

  const sums: Record<string, number> = {};
  const fieldsFound = new Set<string>();

  // 最初のレコードから集計対象フィールドを検出
  const firstRecord = filtered[0] ?? rawRecords[0];
  if (!firstRecord) {
    return {
      totalRecords: data.length,
      filteredRecords: 0,
      excludedCancelledCount: cancelledCount,
      sums: {},
      note: "全件が取消済みのため集計対象がありません。",
    };
  }

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
      ...(cancelledCount > 0 ? {
        filteredRecords: filtered.length,
        excludedCancelledCount: cancelledCount,
      } : {}),
      sums: {},
      note: "集計対象の数値フィールドが見つかりませんでした。",
    };
  }

  // フィルタ済みレコードで集計
  for (const record of filtered) {
    for (const field of fieldsFound) {
      const val = record[field];
      if (val != null) {
        const num = Number(val);
        if (!isNaN(num)) {
          sums[field] = (sums[field] ?? 0) + num;
        }
      }
    }
  }

  // 小数点の丸め誤差を防ぐ
  for (const key of Object.keys(sums)) {
    const val = sums[key]!;
    if (!Number.isInteger(val)) {
      sums[key] = Math.round(val * 100) / 100;
    }
  }

  let note: string;
  if (cancelledCount > 0) {
    note = `取消済み${cancelledCount}件を除外して集計しました（集計対象: ${filtered.length}件）。この集計値はツール側で正確に計算済みです。AIが個別レコードを合算する必要はありません。`;
  } else if (isPartialResult) {
    note = "この集計は取得分のみです。全件ではない可能性があります。ページネーションで残りを取得してください。";
  } else {
    note = "この集計値はAPIレスポンス全件から計算済みです。AIが個別レコードを合算する必要はありません。";
  }

  return {
    totalRecords: data.length,
    ...(cancelledCount > 0 ? {
      filteredRecords: filtered.length,
      excludedCancelledCount: cancelledCount,
    } : {}),
    sums,
    note,
  };
}
