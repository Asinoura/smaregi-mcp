import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { register as registerConfigure } from "./configure.js";
import { register as registerAuthStatus } from "./auth-status.js";
import { register as registerServerInfo } from "./server-info.js";
import { register as registerApiGet } from "./api-get.js";
import { register as registerApiPost } from "./api-post.js";
import { register as registerApiPut } from "./api-put.js";
import { register as registerApiDelete } from "./api-delete.js";
import { register as registerApiPatch } from "./api-patch.js";
import { register as registerApiListPaths } from "./api-list-paths.js";
import { mutationsEnabled } from "./mutation-guard.js";

/**
 * ツールを登録する。
 * 変更系（POST/PUT/PATCH/DELETE）は SMAREGI_ENABLE_MUTATIONS=true のときだけ登録し、
 * 有効にしていなければ LLM からは見えない（商品名などに紛れ込んだ指示で呼ばれることもない）。
 */
export function registerTools(server: McpServer): void {
  registerConfigure(server);
  registerAuthStatus(server);
  registerServerInfo(server);
  registerApiGet(server);
  registerApiListPaths(server);

  if (mutationsEnabled()) {
    registerApiPost(server);
    registerApiPut(server);
    registerApiDelete(server);
    registerApiPatch(server);
  }
}
