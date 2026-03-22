import { describe, it, expect } from "vitest";
import { validateParams } from "../../src/validation/validator.js";

describe("validator", () => {
  describe("validateParams", () => {
    it("正しいパラメータを受け入れる", () => {
      const result = validateParams("/transactions", {
        transaction_head_division: "1",
        cancel_division: "0",
      });
      expect(result.success).toBe(true);
    });

    it("不正な cancel_division を拒否する", () => {
      const result = validateParams("/transactions", {
        cancel_division: "2",
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

    it("limit の範囲チェック", () => {
      const valid = validateParams("/products", { limit: 100 });
      expect(valid.success).toBe(true);

      const tooLarge = validateParams("/products", { limit: 9999 });
      expect(tooLarge.success).toBe(false);
    });
  });
});
