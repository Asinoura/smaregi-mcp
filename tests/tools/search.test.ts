import { describe, it, expect } from "vitest";
import { searchEndpoints } from "../../src/search/index.js";

describe("searchEndpoints", () => {
  it("「売上」で検索すると transactions がマッチする", () => {
    const results = searchEndpoints("売上");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.path === "/transactions")).toBe(true);
  });

  it("「商品」で検索すると products がマッチする", () => {
    const results = searchEndpoints("商品");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.path === "/products")).toBe(true);
  });

  it("「在庫」で検索すると stock がマッチする", () => {
    const results = searchEndpoints("在庫");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.path === "/stock")).toBe(true);
  });

  it("「店舗」で検索すると stores がマッチする", () => {
    const results = searchEndpoints("店舗");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.path === "/stores")).toBe(true);
  });

  it("空クエリは空配列を返す", () => {
    const results = searchEndpoints("");
    expect(results).toEqual([]);
  });

  it("一致しないクエリは空配列を返す", () => {
    const results = searchEndpoints("zzzzzzz");
    expect(results).toEqual([]);
  });

  it("最大5件まで返す", () => {
    const results = searchEndpoints("取引 売上 商品 在庫 店舗");
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it("「会員」で検索すると customers がマッチする", () => {
    const results = searchEndpoints("会員");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.path === "/customers")).toBe(true);
  });

  it("「部門」で検索すると categories がマッチする", () => {
    const results = searchEndpoints("部門");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.path === "/categories")).toBe(true);
  });

  it("「日次」で検索すると daily_summaries がマッチする", () => {
    const results = searchEndpoints("日次");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.path === "/daily_summaries")).toBe(true);
  });

  it("「決済」で検索すると payment_methods がマッチする", () => {
    const results = searchEndpoints("決済");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.path === "/payment_methods")).toBe(true);
  });

  it("「予算」で検索すると budget がマッチする", () => {
    const results = searchEndpoints("予算");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.path === "/budget/{store_id}")).toBe(true);
  });
});
