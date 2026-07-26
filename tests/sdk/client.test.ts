import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { configureSdk, getSdk } from "../../src/sdk/client.js";
import { state } from "../../src/state.js";

describe("SDK client adapter", () => {
  beforeEach(() => {
    state.sdk = null;
    state.contractId = null;
    state.authenticatedAt = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects API access before authentication", () => {
    expect(() => getSdk()).toThrow("未認証です");
  });

  it("exchanges a token through pfapi-sdk and stores only the SDK instance", async () => {
    const urls: string[] = [];
    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      urls.push(url);

      if (url.includes("/token")) {
        return new Response(JSON.stringify({
          access_token: "test-access-token",
          token_type: "Bearer",
          expires_in: 3600,
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      return new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await configureSdk({
      clientId: "client-id",
      clientSecret: "client-secret",
      contractId: "contract-123",
    });

    expect(urls[0]).toBe("https://id.smaregi.dev/app/contract-123/token");
    expect(urls[1]).toContain("https://api.smaregi.dev/contract-123/pos/stores");
    expect(state.sdk).toBeTruthy();
    expect(state.contractId).toBe("contract-123");
    expect(state).not.toHaveProperty("clientSecret");
    expect(state).not.toHaveProperty("accessToken");
  });
});
