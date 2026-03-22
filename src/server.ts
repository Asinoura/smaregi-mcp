import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAuthTools } from "./tools/auth.js";
import { registerStoreTools } from "./tools/store.js";
import { registerSearchTools } from "./tools/search.js";
import { registerExecuteTool } from "./tools/execute.js";

const server = new McpServer({
  name: "smaregi",
  version: "1.0.0",
});

registerAuthTools(server);
registerStoreTools(server);
registerSearchTools(server);
registerExecuteTool(server);

const transport = new StdioServerTransport();
await server.connect(transport);
