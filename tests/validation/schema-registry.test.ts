import { describe, it, expect } from "vitest";
import { validateParams } from "../../src/validation/validator.js";

describe("validator", () => {
  describe("validateParams", () => {
    it("正しいパラメータを受け入れる", () => {
      const result = validateParams("/transactions", {
        transaction_head_division: "1",
        "transaction_date_time-from": "2024-01-01T00:00:00+09:00",
        "transaction_date_time-to": "2024-01-31T23:59:59+09:00",
      });
      expect(result.success).toBe(true);
    });

    it("不正な transaction_head_division を拒否する", () => {
      const result = validateParams("/transactions", {
        transaction_head_division: "99",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("未知のパラメータを拒否する", () => {
      const result = validateParams("/transactions", {
        unknown_param: "value",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("不明なパラメータ");
      expect(result.error).toContain("unknown_param");
    });

    it("パラメータなしのリクエストを受け入れる", () => {
      const result = validateParams("/stores", {});
      expect(result.success).toBe(true);
    });

    it("未知のエンドポイントはバリデーションをスキップする", () => {
      const result = validateParams("/unknown/endpoint", {
        any: "param",
      });
      expect(result.success).toBe(true);
    });

    it("daily_summaries の limit 上限チェック", () => {
      const valid = validateParams("/daily_summaries", { limit: 100 });
      expect(valid.success).toBe(true);

      const tooLarge = validateParams("/daily_summaries", { limit: 101 });
      expect(tooLarge.success).toBe(false);
    });

    it("新エンドポイントが登録されている", () => {
      const categories = validateParams("/categories", { level: "1" });
      expect(categories.success).toBe(true);

      const customers = validateParams("/customers", { customer_code: "C001" });
      expect(customers.success).toBe(true);

      const payments = validateParams("/payment_methods", { display_flag: "1" });
      expect(payments.success).toBe(true);
    });
  });
});
