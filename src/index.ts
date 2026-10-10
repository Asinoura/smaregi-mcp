import { setupSkills } from "./cli.js";

// CLI サブコマンド処理
const command = process.argv[2];
if (command === "setup-skills") {
  setupSkills();
} else {
  // MCP サーバー起動
  const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
  const { VERSION } = await import("./constants.js");
  const { registerTools } = await import("./tools/register-all.js");

  const server = new McpServer({
    name: "smaregi-mcp",
    version: VERSION,
    description: "スマレジPOS APIと連携するMCPサーバー",
  });

  registerTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
