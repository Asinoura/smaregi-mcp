export const VERSION = "0.1.0";
export const DEFAULT_IDP_HOST = "https://id.smaregi.dev";
export const DEFAULT_API_HOST = "https://api.smaregi.dev";
/** 既定で要求するスコープ（読み取りのみ） */
export const DEFAULT_SCOPES = [
  "pos.products:read",
  "pos.customers:read",
  "pos.stores:read",
  "pos.transactions:read",
  "pos.staffs:read",
  "pos.stock:read",
];
/** SMAREGI_ENABLE_MUTATIONS=true のときだけ既定のスコープに加える書き込みスコープ */
export const DEFAULT_WRITE_SCOPES = [
  "pos.products:write",
  "pos.customers:write",
  "pos.transactions:write",
  "pos.stock:write",
];
export const TOKEN_REFRESH_BUFFER_SECONDS = 60;
/** スマレジへの1回の通信を待つ上限 */
export const REQUEST_TIMEOUT_MS = 30_000;
/** エラーに含めるスマレジの応答本文の上限（文字数） */
export const MAX_ERROR_BODY_CHARS = 500;
export const CONFIG_DIR_NAME = "smaregi-mcp";
