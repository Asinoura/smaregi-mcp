import type { HttpMethod, JsonObject, QueryParams } from "@asinoura/pfapi-sdk";

import { requestWithSdk } from "../sdk/client.js";

const MAX_RESPONSE_TOKENS = 10_000;

export async function smaregiRequest(
  path: string,
  options?: RequestInit,
): Promise<unknown> {
  const parsed = new URL(path, "https://mcp.local");
  const query: QueryParams = {};
  parsed.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  const method = (options?.method ?? "GET").toUpperCase() as HttpMethod;
  const body = typeof options?.body === "string"
    ? JSON.parse(options.body) as JsonObject
    : undefined;

  return requestWithSdk({
    method,
    path: parsed.pathname,
    query: Object.keys(query).length > 0 ? query : undefined,
    body,
  });
}

export function truncateResponse(
  data: unknown,
  _maxTokens: number = MAX_RESPONSE_TOKENS,
): { text: string; truncated: boolean } {
  // TODO: サイズ制御は後で再実装する。まず全件返して管理画面と数値一致を確認。
  const json = JSON.stringify(data, null, 2);
  return { text: json, truncated: false };
}
