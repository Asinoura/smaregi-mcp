import { describe, it, expect, vi, beforeEach } from "vitest";
import { startAuthFlow } from "../../src/auth/oauth.js";

// token-store のモック
vi.mock("../../src/auth/token-store.js", () => ({
  saveTokens: vi.fn(),
}));

describe("oauth (client_credentials)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("正しいトークンURLを構築する（sandbox）", async () => {
    const originalFetch = globalThis.fetch;
    let capturedUrl = "";

    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({
          access_token: "test-token",
          expires_in: 3600,
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    try {
      await startAuthFlow("client-id", "client-secret", "contract-123");
      expect(capturedUrl).toBe("https://id.smaregi.dev/app/contract-123/token");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("Basic認証ヘッダーを送信する", async () => {
    const originalFetch = globalThis.fetch;
    let capturedHeaders: HeadersInit | undefined;

    globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      capturedHeaders = init?.headers;
      return new Response(
        JSON.stringify({
          access_token: "test-token",
          expires_in: 3600,
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    try {
      await startAuthFlow("my-id", "my-secret", "contract-1");
      const expected = Buffer.from("my-id:my-secret", "utf8").toString("base64");
      expect(capturedHeaders).toHaveProperty("Authorization", `Basic ${expected}`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("client_credentials grant_type を送信する", async () => {
    const originalFetch = globalThis.fetch;
    let capturedBody = "";

    globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = String(init?.body ?? "");
      return new Response(
        JSON.stringify({
          access_token: "test-token",
          expires_in: 3600,
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    try {
      await startAuthFlow("id", "secret", "contract");
      expect(capturedBody).toContain("grant_type=client_credentials");
      expect(capturedBody).toContain("scope=");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("トークンを正しく返す", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          access_token: "access-abc",
          refresh_token: "refresh-xyz",
          expires_in: 7200,
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    try {
      const tokens = await startAuthFlow("id", "secret", "contract");
      expect(tokens.accessToken).toBe("access-abc");
      expect(tokens.refreshToken).toBe("refresh-xyz");
      expect(tokens.expiresAt).toBeGreaterThan(Date.now());
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("APIエラー時に例外を投げる", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = vi.fn(async () => {
      return new Response("Unauthorized", { status: 401 });
    }) as typeof fetch;

    try {
      await expect(startAuthFlow("id", "secret", "contract")).rejects.toThrow(
        "トークン取得失敗 (401)",
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
