import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { state } from "../state.js";
import { startAuthFlow } from "../auth/oauth.js";
import { loadTokens } from "../auth/token-store.js";

export function registerAuthTools(server: McpServer): void {
  server.registerTool("authenticate", {
    description:
      "スマレジPlatform APIのclient_credentials grantで認証し、アクセストークンを取得します。",
    inputSchema: {
      client_id: z.string().describe("スマレジAPIのクライアントID"),
      client_secret: z.string().describe("スマレジAPIのクライアントシークレット"),
      contract_id: z.string().describe("スマレジの契約ID"),
    },
  }, async (args) => {
    try {
      state.clientId = args.client_id;
      state.clientSecret = args.client_secret;
      state.contractId = args.contract_id;

      const tokens = await startAuthFlow(
        args.client_id,
        args.client_secret,
        args.contract_id,
      );

      state.accessToken = tokens.accessToken;
      state.refreshToken = tokens.refreshToken;
      state.tokenExpiresAt = tokens.expiresAt;

      return {
        content: [{
          type: "text" as const,
          text: `認証が完了しました。契約ID: ${args.contract_id}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text" as const,
          text: `認証に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  });

  server.registerTool("auth_status", {
    description: "現在の認証状態（トークンの有無と有効期限）を確認します。",
  }, async () => {
    // 永続化されたトークンの読み込みを試みる
    if (!state.accessToken) {
      const saved = loadTokens();
      if (saved) {
        state.accessToken = saved.accessToken;
        state.refreshToken = saved.refreshToken;
        state.tokenExpiresAt = saved.expiresAt;
        state.contractId = saved.contractId;
      }
    }

    if (!state.accessToken) {
      return {
        content: [{
          type: "text" as const,
          text: "未認証です。authenticateツールで認証してください。",
        }],
      };
    }

    const now = Date.now();
    const expiresAt = state.tokenExpiresAt ?? 0;
    const remainingMs = expiresAt - now;
    const remainingMin = Math.floor(remainingMs / 60000);

    const status = remainingMs > 0
      ? `認証済み（残り${remainingMin}分）`
      : "トークン期限切れ（自動リフレッシュされます）";

    return {
      content: [{
        type: "text" as const,
        text: [
          `状態: ${status}`,
          `契約ID: ${state.contractId ?? "未設定"}`,
          `店舗ID: ${state.activeStoreId ?? "未設定"}`,
        ].join("\n"),
      }],
    };
  });
}
