import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig } from "../config/config.js";
import { loadToken } from "../auth/token-store.js";

export function register(server: McpServer): void {
  server.tool(
    "smaregi_auth_status",
    "スマレジAPIの認証状態を確認します",
    {},
    async () => {
      try {
        const config = await loadConfig();
        const token = await loadToken();

        const lines: string[] = [
          `契約ID: ${config.contractId || "(未設定)"}`,
          `クライアントID: ${config.clientId || "(未設定)"}`,
          `IDP Host: ${config.idpHost}`,
          `API Host: ${config.apiHost}`,
          `スコープ: ${config.scopes.join(", ")}`,
          "",
          "--- トークン情報 ---",
        ];

        if (token) {
          const expiresAt = new Date(token.obtained_at + token.expires_in * 1000);
          const isValid = Date.now() < expiresAt.getTime();
          lines.push(
            "トークン: 取得済み（値は非表示）",
            `有効期限: ${expiresAt.toISOString()}`,
            `状態: ${isValid ? "有効" : "期限切れ"}`
          );
        } else {
          lines.push("トークン: 未取得");
        }

        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `認証状態の確認に失敗: ${e}` }],
          isError: true,
        };
      }
    }
  );
}
