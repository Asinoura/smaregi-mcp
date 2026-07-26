import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { state } from "../state.js";
import { smaregiRequest } from "../api/client.js";
import { sanitizeErrorMessage } from "../utils/sanitize.js";

export function registerStoreTools(server: McpServer): void {
  server.registerTool("set_store", {
    description:
      "APIリクエストに使用する店舗IDを設定します。以降のAPI呼び出しでこの店舗IDが自動的に使用されます。",
    inputSchema: {
      store_id: z.string().describe("店舗ID"),
    },
  }, async (args) => {
    state.activeStoreId = args.store_id;
    return {
      content: [{
        type: "text" as const,
        text: `店舗ID ${args.store_id} を設定しました。`,
      }],
    };
  });

  server.registerTool("list_stores", {
    description: "契約に紐づく店舗一覧を取得します。認証が必要です。",
  }, async () => {
    try {
      const data = await smaregiRequest("/stores");
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(data, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text" as const,
          text: `店舗一覧の取得に失敗しました: ${sanitizeErrorMessage(error instanceof Error ? error.message : String(error))}`,
        }],
        isError: true,
      };
    }
  });
}
