import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { state } from "../state.js";
import { configureSdk } from "../sdk/client.js";
import { sanitizeErrorMessage } from "../utils/sanitize.js";

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
      await configureSdk({
        clientId: args.client_id,
        clientSecret: args.client_secret,
        contractId: args.contract_id,
      });

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
          text: `認証に失敗しました: ${sanitizeErrorMessage(error instanceof Error ? error.message : String(error))}`,
        }],
        isError: true,
      };
    }
  });

  server.registerTool("auth_status", {
    description: "現在のSDK認証状態を確認します。",
  }, async () => {
    if (!state.sdk) {
      return {
        content: [{
          type: "text" as const,
          text: "未認証です。authenticateツールで認証してください。",
        }],
      };
    }

    return {
      content: [{
        type: "text" as const,
        text: [
          "状態: 認証済み（トークンはSDKが自動更新）",
          `契約ID: ${state.contractId ?? "未設定"}`,
          `店舗ID: ${state.activeStoreId ?? "未設定"}`,
        ].join("\n"),
      }],
    };
  });
}
