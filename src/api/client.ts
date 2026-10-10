import type { Config } from "../config/schema.js";
import { getAccessToken } from "../auth/token-manager.js";
import { REQUEST_TIMEOUT_MS } from "../constants.js";
import { isTimeoutError, sanitizeErrorBody } from "./errors.js";
import { buildApiUrl } from "./url.js";

/** スマレジAPIリクエスト */
export async function apiRequest(
  config: Config,
  method: string,
  path: string,
  query?: Record<string, string>,
  body?: unknown
): Promise<unknown> {
  // トークンを取りに行く前に確かめる
  const url = buildApiUrl(config, path);
  const accessToken = await getAccessToken(config);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (e) {
    if (isTimeoutError(e)) {
      throw new Error(
        `スマレジAPIが ${REQUEST_TIMEOUT_MS / 1000} 秒以内に応答しませんでした (${method} ${path})`
      );
    }
    throw e;
  }

  if (!response.ok) {
    const errorBody = sanitizeErrorBody(await response.text(), [accessToken]);
    throw new Error(
      `スマレジAPI エラー (${method} ${path} → ${response.status}): ${errorBody}`
    );
  }

  // 204 No Content の場合
  if (response.status === 204) {
    return { success: true };
  }

  return response.json();
}
