import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadConfig } from "../config/config.js";
import { apiRequest } from "../api/client.js";
import { assertMutationsEnabled } from "./mutation-guard.js";

export function register(server: McpServer): void {
  server.tool(
    "smaregi_api_patch",
    "スマレジAPIにPATCHリクエストを送信します",
    {
      path: z.string().describe("APIパス（例: /products/{productId}）"),
      body: z.record(z.string(), z.unknown()).describe("リクエストボディ"),
      query: z.record(z.string(), z.string()).optional().describe("クエリパラメータ"),
      confirm: z.literal(true).describe("変更内容を確認した場合のみ true"),
    },
    async ({ path, body, query, confirm }) => {
      try {
        assertMutationsEnabled(confirm);
        const config = await loadConfig();
        const result = await apiRequest(config, "PATCH", path, query, body);
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
