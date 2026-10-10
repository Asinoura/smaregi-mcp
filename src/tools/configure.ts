import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { saveConfig } from "../config/config.js";

export function register(server: McpServer): void {
  server.tool(
    "smaregi_configure",
    "スマレジAPIの接続設定を保存します",
    {
      contract_id: z.string().describe("契約ID"),
      client_id: z.string().describe("クライアントID"),
    },
    async ({ contract_id, client_id }) => {
      // ホストとスコープは書かない。書くと SMAREGI_IDP_HOST / SMAREGI_API_HOST より
      // ファイルの値（既定のサンドボックス）が優先され、本番の設定が効かなくなる。
      await saveConfig({
        contractId: contract_id,
        clientId: client_id,
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
