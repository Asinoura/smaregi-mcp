import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchEndpoints } from "../search/index.js";
import { injectKnowledge } from "../search/knowledge-injector.js";

export function registerSearchTools(server: McpServer): void {
  server.registerTool("search_tools", {
    description:
      "スマレジAPIのエンドポイントを検索します。キーワードを入力すると、関連するAPIとその使い方（ドメイン知識を含む）を返します。executeツールでAPIを実行する前に必ずこのツールで検索してください。",
    inputSchema: {
      query: z.string().describe("検索キーワード（例: '売上', '商品', '在庫'）"),
    },
  }, async (args) => {
    const matches = searchEndpoints(args.query);
    const results = matches.map((match) => injectKnowledge(match));

    if (results.length === 0) {
      return {
        content: [{
          type: "text" as const,
          text: `「${args.query}」に一致するAPIエンドポイントが見つかりませんでした。`,
        }],
      };
    }

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ matches: results }, null, 2),
      }],
    };
  });
}
