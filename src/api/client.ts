import { state } from "../state.js";
import { ensureAuth, refreshAccessToken } from "../auth/oauth.js";
import { sanitizeErrorMessage } from "../utils/sanitize.js";

const API_BASE = process.env.SMAREGI_ENV === "production"
  ? "https://api.smaregi.jp"
  : "https://api.smaregi.dev";
const MAX_RESPONSE_TOKENS = 10_000;

export async function smaregiRequest(
  path: string,
  options?: RequestInit,
): Promise<unknown> {
  await ensureAuth();

  if (!state.contractId) {
    throw new Error("契約IDが設定されていません。authenticateツールで認証してください。");
  }

  const url = `${API_BASE}/${state.contractId}/pos${path}`;

  const doFetch = async () => {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${state.accessToken}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API Error (${res.status}): ${sanitizeErrorMessage(text)}`);
    }

    return res.json();
  };

  try {
    return await doFetch();
  } catch (error) {
    // 401の場合はリフレッシュして1回だけリトライ
    if (error instanceof Error && error.message.includes("401")) {
      await refreshAccessToken();
      return await doFetch();
    }
    throw error;
  }
}

export function truncateResponse(
  data: unknown,
  _maxTokens: number = MAX_RESPONSE_TOKENS,
): { text: string; truncated: boolean } {
  // TODO: サイズ制御は後で再実装する。まず全件返して管理画面と数値一致を確認。
  const json = JSON.stringify(data, null, 2);
  return { text: json, truncated: false };
}
