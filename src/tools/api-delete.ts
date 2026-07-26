import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadConfig } from "../config/config.js";
import { apiRequest } from "../api/client.js";
import { assertMutationsEnabled } from "./mutation-guard.js";

export function register(server: McpServer): void {
  server.tool(
    "smaregi_api_delete",
    "スマレジAPIにDELETEリクエストを送信します",
    {
      path: z.string().describe("APIパス（例: /products/{productId}）"),
      query: z.record(z.string(), z.string()).optional().describe("クエリパラメータ"),
      confirm: z.literal(true).describe("削除内容を確認した場合のみ true"),
    },
    async ({ path, query, confirm }) => {
      try {
        assertMutationsEnabled(confirm);
        const config = await loadConfig();
        const result = await apiRequest(config, "DELETE", path, query);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `エラー: ${e}` }],
          isError: true,
        };
      }
    }
  );
}
