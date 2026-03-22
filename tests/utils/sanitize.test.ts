import { describe, it, expect } from "vitest";
import { sanitizeErrorMessage } from "../../src/utils/sanitize.js";

describe("sanitizeErrorMessage", () => {
  it("Bearer トークンをマスクする", () => {
    const msg = 'Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.abc.def';
    expect(sanitizeErrorMessage(msg)).toBe("Authorization: Bearer [MASKED]");
  });

  it("Basic 認証ヘッダをマスクする", () => {
    const msg = "Authorization: Basic dXNlcjpwYXNz";
    expect(sanitizeErrorMessage(msg)).toBe("Authorization: Basic [MASKED]");
  });

  it("access_token の JSON 値をマスクする", () => {
    const msg = '{"access_token": "secret-token-value", "token_type": "Bearer"}';
    expect(sanitizeErrorMessage(msg)).toContain('"access_token": "[MASKED]"');
    expect(sanitizeErrorMessage(msg)).not.toContain("secret-token-value");
  });

  it("refresh_token の JSON 値をマスクする", () => {
    const msg = '{"refresh_token": "refresh-secret"}';
    expect(sanitizeErrorMessage(msg)).toContain('"refresh_token": "[MASKED]"');
  });

  it("client_secret の JSON 値をマスクする", () => {
    const msg = '{"client_secret": "my-secret-key"}';
    expect(sanitizeErrorMessage(msg)).toContain('"client_secret": "[MASKED]"');
  });

  it("機密情報を含まないメッセージはそのまま返す", () => {
    const msg = "API Error (404): Not Found";
    expect(sanitizeErrorMessage(msg)).toBe(msg);
  });

  it("複数の機密情報を同時にマスクする", () => {
    const msg = '{"access_token": "abc", "refresh_token": "def", "client_secret": "ghi"}';
    const result = sanitizeErrorMessage(msg);
    expect(result).not.toContain("abc");
    expect(result).not.toContain("def");
    expect(result).not.toContain("ghi");
  });
});
