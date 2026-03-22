import { describe, it, expect, vi } from "vitest";
import {
  needsSplitting,
  splitPeriod,
  computeCoveredMonths,
  fetchWithPeriodSplitting,
} from "../../src/api/period-splitter.js";

describe("needsSplitting", () => {
  it("30日間は分割不要", () => {
    expect(needsSplitting(
      "2025-01-01T00:00:00+09:00",
      "2025-01-30T23:59:59+09:00",
    )).toBe(false);
  });

  it("31日間は分割不要", () => {
    expect(needsSplitting(
      "2025-01-01T00:00:00+09:00",
      "2025-01-31T23:59:59+09:00",
    )).toBe(false);
  });

  it("32日間は分割必要", () => {
    expect(needsSplitting(
      "2025-01-01T00:00:00+09:00",
      "2025-02-01T23:59:59+09:00",
    )).toBe(true);
  });

  it("1年間は分割必要", () => {
    expect(needsSplitting(
      "2025-01-01T00:00:00+09:00",
      "2025-12-31T23:59:59+09:00",
    )).toBe(true);
  });
});

describe("splitPeriod", () => {
  it("60日間を2チャンクに分割", () => {
    const chunks = splitPeriod(
      "2025-01-01T00:00:00+09:00",
      "2025-03-01T23:59:59+09:00",
    );
    expect(chunks.length).toBe(2);
    // 最初のチャンクは31日間
    expect(chunks[0].from).toContain("2025-01-01");
    expect(chunks[0].to).toContain("2025-01-31");
    // 2番目のチャンクは残り
    expect(chunks[1].from).toContain("2025-02-01");
    expect(chunks[1].to).toContain("2025-03-01");
  });

  it("365日間を12チャンクに分割", () => {
    const chunks = splitPeriod(
      "2025-01-01T00:00:00+09:00",
      "2025-12-31T23:59:59+09:00",
    );
    expect(chunks.length).toBe(12);
    // 最初のチャンクは1/1開始
    expect(chunks[0].from).toContain("2025-01-01");
    // 最後のチャンクは12/31で終わる
    expect(chunks[chunks.length - 1].to).toContain("2025-12-31");
  });

  it("チャンク境界が連続する（ギャップなし）", () => {
    const chunks = splitPeriod(
      "2025-01-01T00:00:00+09:00",
      "2025-06-30T23:59:59+09:00",
    );
    for (let i = 1; i < chunks.length; i++) {
      // 前チャンクの to の翌日 = 次チャンクの from
      const prevEndDate = chunks[i - 1].to.substring(0, 10);
      const nextStartDate = chunks[i].from.substring(0, 10);
      const prevEnd = new Date(prevEndDate);
      const nextStart = new Date(nextStartDate);
      const diffDays = (nextStart.getTime() - prevEnd.getTime()) / (24 * 60 * 60 * 1000);
      expect(diffDays).toBe(1);
    }
  });
});

describe("computeCoveredMonths", () => {
  it("3ヶ月間の月一覧を生成", () => {
    const months = computeCoveredMonths(
      "2025-01-01T00:00:00+09:00",
      "2025-03-31T23:59:59+09:00",
    );
    expect(months).toEqual(["2025-01", "2025-02", "2025-03"]);
  });

  it("年をまたぐ場合", () => {
    const months = computeCoveredMonths(
      "2024-11-01T00:00:00+09:00",
      "2025-02-28T23:59:59+09:00",
    );
    expect(months).toEqual(["2024-11", "2024-12", "2025-01", "2025-02"]);
  });

  it("1ヶ月以内", () => {
    const months = computeCoveredMonths(
      "2025-03-10T00:00:00+09:00",
      "2025-03-20T23:59:59+09:00",
    );
    expect(months).toEqual(["2025-03"]);
  });
});

describe("fetchWithPeriodSplitting", () => {
  it("3チャンクの結果をマージする", async () => {
    const mockRequestFn = vi.fn()
      .mockResolvedValueOnce([
        { transactionDateTime: "2025-01-15T10:00:00+09:00", total: "1000", cancelDivision: "0" },
        { transactionDateTime: "2025-01-20T10:00:00+09:00", total: "2000", cancelDivision: "0" },
      ])
      .mockResolvedValueOnce([
        { transactionDateTime: "2025-02-10T10:00:00+09:00", total: "3000", cancelDivision: "0" },
      ])
      .mockResolvedValueOnce([
        { transactionDateTime: "2025-03-05T10:00:00+09:00", total: "4000", cancelDivision: "0" },
      ]);

    const result = await fetchWithPeriodSplitting(
      "/transactions",
      {
        "transaction_date_time-from": "2025-01-01T00:00:00+09:00",
        "transaction_date_time-to": "2025-03-31T23:59:59+09:00",
        "transaction_head_division": "1",
      },
      mockRequestFn,
      { delayMs: 0 },
    );

    expect(result.data).toHaveLength(4);
    expect(result.apiCalls).toBe(3);
    expect(result.failedChunks).toHaveLength(0);
    expect(result.coveredMonths).toEqual(["2025-01", "2025-02", "2025-03"]);

    // monthly_breakdown
    expect(result.monthlyBreakdown["2025-01"]?.count).toBe(2);
    expect(result.monthlyBreakdown["2025-01"]?.total).toBe(3000);
    expect(result.monthlyBreakdown["2025-02"]?.count).toBe(1);
    expect(result.monthlyBreakdown["2025-02"]?.total).toBe(3000);
    expect(result.monthlyBreakdown["2025-03"]?.count).toBe(1);
    expect(result.monthlyBreakdown["2025-03"]?.total).toBe(4000);
  });

  it("部分失敗時は取得できた分を返す", async () => {
    const mockRequestFn = vi.fn()
      .mockResolvedValueOnce([
        { transactionDateTime: "2025-01-15T10:00:00+09:00", total: "1000", cancelDivision: "0" },
      ])
      .mockRejectedValueOnce(new Error("API Error (500)"))
      .mockResolvedValueOnce([
        { transactionDateTime: "2025-03-05T10:00:00+09:00", total: "2000", cancelDivision: "0" },
      ]);

    const result = await fetchWithPeriodSplitting(
      "/transactions",
      {
        "transaction_date_time-from": "2025-01-01T00:00:00+09:00",
        "transaction_date_time-to": "2025-03-31T23:59:59+09:00",
      },
      mockRequestFn,
      { delayMs: 0 },
    );

    expect(result.data).toHaveLength(2);
    expect(result.apiCalls).toBe(3);
    expect(result.failedChunks).toHaveLength(1);
  });

  it("取消済みレコードはmonthly_breakdownから除外", async () => {
    const mockRequestFn = vi.fn()
      .mockResolvedValueOnce([
        { transactionDateTime: "2025-01-15T10:00:00+09:00", total: "1000", cancelDivision: "0" },
        { transactionDateTime: "2025-01-16T10:00:00+09:00", total: "500", cancelDivision: "1" },
      ]);

    const result = await fetchWithPeriodSplitting(
      "/transactions",
      {
        "transaction_date_time-from": "2025-01-01T00:00:00+09:00",
        "transaction_date_time-to": "2025-02-01T23:59:59+09:00",
      },
      mockRequestFn,
      { delayMs: 0 },
    );

    // data には全レコードが含まれる（フィルタは computeAggregation と monthlyBreakdown で行う）
    expect(result.data).toHaveLength(2);
    // monthly_breakdown は取消済み除外
    expect(result.monthlyBreakdown["2025-01"]?.count).toBe(1);
    expect(result.monthlyBreakdown["2025-01"]?.total).toBe(1000);
  });
});
