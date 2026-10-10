import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VERSION, DEFAULT_IDP_HOST, DEFAULT_API_HOST } from "../constants.js";
import { loadConfig } from "../config/config.js";
import { mutationsEnabled } from "./mutation-guard.js";

export function register(server: McpServer): void {
  server.tool(
    "smaregi_server_info",
    "MCPサーバーのバージョンと接続先情報を表示します",
    {},
    async () => {
      let idpHost = DEFAULT_IDP_HOST;
      let apiHost = DEFAULT_API_HOST;

      try {
        const config = await loadConfig();
        idpHost = config.idpHost;
        apiHost = config.apiHost;
      } catch {
        // 設定未完了の場合はデフォルト値を使用
      }

      const text = [
        `smaregi-mcp v${VERSION}`,
        `IDP Host: ${idpHost}`,
        `API Host: ${apiHost}`,
        mutationsEnabled()
          ? "変更系ツール（POST/PUT/PATCH/DELETE）: 有効"
          : "変更系ツール（POST/PUT/PATCH/DELETE）: 無効（使うには SMAREGI_ENABLE_MUTATIONS=true を設定）",
      ].join("\n");

      return { content: [{ type: "text" as const, text }] };
    }
  );
}
