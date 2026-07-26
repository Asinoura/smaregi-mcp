import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { saveConfig } from "../config/config.js";
import { DEFAULT_IDP_HOST, DEFAULT_API_HOST, DEFAULT_SCOPES } from "../constants.js";

export function register(server: McpServer): void {
  server.tool(
    "smaregi_configure",
    "スマレジAPIの接続設定を保存します",
    {
      contract_id: z.string().describe("契約ID"),
      client_id: z.string().describe("クライアントID"),
    },
    async ({ contract_id, client_id }) => {
      await saveConfig({
        contractId: contract_id,
        clientId: client_id,
        idpHost: DEFAULT_IDP_HOST,
        apiHost: DEFAULT_API_HOST,
        scopes: DEFAULT_SCOPES,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `公開設定を保存しました。\n契約ID: ${contract_id}\nクライアントID: ${client_id}\nクライアントシークレットは SMAREGI_CLIENT_SECRET 環境変数で設定してください。`,
          },
        ],
      };
    }
  );
}
