import { describe, it, expect } from "vitest";
import { computeAggregation } from "../../src/api/aggregation.js";

describe("computeAggregation", () => {
  it("取引データの金額フィールドを正確に合計する", () => {
    const data = [
      { transactionHeadId: "1", total: "10000", subtotal: "9091", taxInclude: "909", cancelDivision: "0" },
      { transactionHeadId: "2", total: "20000", subtotal: "18182", taxInclude: "1818", cancelDivision: "0" },
      { transactionHeadId: "3", total: "5000", subtotal: "4545", taxInclude: "455", cancelDivision: "0" },
    ];

    const result = computeAggregation(data);
    expect(result).not.toBeNull();
    expect(result!.totalRecords).toBe(3);
    expect(result!.sums.total).toBe(35000);
    expect(result!.sums.subtotal).toBe(31818);
    expect(result!.sums.taxInclude).toBe(3182);
  });

  it("取消済み取引を自動除外して集計する", () => {
    const data = [
      { transactionHeadId: "1", total: "10000", cancelDivision: "0" },
      { transactionHeadId: "2", total: "5500", cancelDivision: "1" }, // 取消済み
      { transactionHeadId: "3", total: "20000", cancelDivision: "0" },
    ];

    const result = computeAggregation(data);
    expect(result).not.toBeNull();
    expect(result!.totalRecords).toBe(3);
    expect(result!.filteredRecords).toBe(2);
    expect(result!.excludedCancelledCount).toBe(1);
    expect(result!.sums.total).toBe(30000); // 5500は除外
    expect(result!.note).toContain("取消済み1件を除外");
  });

  it("実際のケース: 71件中1件取消で管理画面と一致する", () => {
    // 70件の通常取引 + 1件の取消済み
    const data: Record<string, unknown>[] = [];
    let expectedTotal = 0;
    for (let i = 0; i < 70; i++) {
      const total = 14000 + (i * 13) % 200;
      expectedTotal += total;
      data.push({
        transactionHeadId: String(i + 1),
        total: String(total),
        cancelDivision: "0",
      });
    }
    // 取消済み1件を追加
    data.push({
      transactionHeadId: "71",
      total: "5500",
      cancelDivision: "1",
    });

    const result = computeAggregation(data);
    expect(result!.totalRecords).toBe(71);
    expect(result!.filteredRecords).toBe(70);
    expect(result!.excludedCancelledCount).toBe(1);
    expect(result!.sums.total).toBe(expectedTotal); // 取消の5500は含まない
  });

  it("cancelDivisionがないデータはフィルタしない", () => {
    const data = [
      { productId: "1", stockAmount: "50" },
      { productId: "2", stockAmount: "30" },
    ];
    const result = computeAggregation(data);
    expect(result!.totalRecords).toBe(2);
    expect(result!.filteredRecords).toBeUndefined();
    expect(result!.excludedCancelledCount).toBeUndefined();
    expect(result!.sums.stockAmount).toBe(80);
  });

  it("配列でない場合はnullを返す", () => {
    expect(computeAggregation({ id: "1" })).toBeNull();
    expect(computeAggregation("string")).toBeNull();
    expect(computeAggregation(null)).toBeNull();
  });

  it("空配列の場合はnullを返す", () => {
    expect(computeAggregation([])).toBeNull();
  });

  it("数値フィールドがない場合は空のsumsを返す", () => {
    const data = [
      { name: "店舗A", code: "S001" },
      { name: "店舗B", code: "S002" },
    ];
    const result = computeAggregation(data);
    expect(result!.totalRecords).toBe(2);
    expect(Object.keys(result!.sums)).toHaveLength(0);
  });

  it("在庫データの stockAmount を合計する", () => {
    const data = [
      { productId: "1", storeId: "1", stockAmount: "50" },
      { productId: "2", storeId: "1", stockAmount: "30" },
      { productId: "3", storeId: "1", stockAmount: "0" },
    ];
    const result = computeAggregation(data);
    expect(result!.sums.stockAmount).toBe(80);
  });

  it("partial result の場合に注意メッセージが異なる", () => {
    const data = [{ total: "100" }];
    const full = computeAggregation(data, false);
    const partial = computeAggregation(data, true);
    expect(full!.note).toContain("全件から計算済み");
    expect(partial!.note).toContain("取得分のみ");
  });

  it("文字列の数値フィールドを正しく解釈する", () => {
    const data = [{ total: "993740" }];
    const result = computeAggregation(data);
    expect(result!.sums.total).toBe(993740);
  });
});
