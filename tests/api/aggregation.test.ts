import { describe, it, expect } from "vitest";
import { computeAggregation } from "../../src/api/aggregation.js";

describe("computeAggregation", () => {
  it("取引データの金額フィールドを正確に合計する", () => {
    const data = [
      { transactionHeadId: "1", total: "10000", subtotal: "9091", taxInclude: "909" },
      { transactionHeadId: "2", total: "20000", subtotal: "18182", taxInclude: "1818" },
      { transactionHeadId: "3", total: "5000", subtotal: "4545", taxInclude: "455" },
    ];

    const result = computeAggregation(data);
    expect(result).not.toBeNull();
    expect(result!.totalRecords).toBe(3);
    expect(result!.sums.total).toBe(35000);
    expect(result!.sums.subtotal).toBe(31818);
    expect(result!.sums.taxInclude).toBe(3182);
  });

  it("69件の取引で正確な合計を出す（LLMが間違えるケース）", () => {
    // 69件のダミーデータを生成
    const data = Array.from({ length: 69 }, (_, i) => ({
      transactionHeadId: String(i + 1),
      total: String(14400 + (i * 7) % 100), // 微妙に異なる金額
      subtotal: String(13091 + (i * 7) % 100),
    }));

    const result = computeAggregation(data);
    expect(result).not.toBeNull();
    expect(result!.totalRecords).toBe(69);

    // 手動で期待値を計算
    let expectedTotal = 0;
    let expectedSubtotal = 0;
    for (let i = 0; i < 69; i++) {
      expectedTotal += 14400 + (i * 7) % 100;
      expectedSubtotal += 13091 + (i * 7) % 100;
    }
    expect(result!.sums.total).toBe(expectedTotal);
    expect(result!.sums.subtotal).toBe(expectedSubtotal);
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
    expect(result).not.toBeNull();
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
    const data = [
      { total: "993740" },
    ];
    const result = computeAggregation(data);
    expect(result!.sums.total).toBe(993740);
  });
});
