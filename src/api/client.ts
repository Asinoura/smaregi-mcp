import { state } from "../state.js";
import { ensureAuth, refreshAccessToken } from "../auth/oauth.js";

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
      throw new Error(`API Error (${res.status}): ${text}`);
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
  maxTokens: number = MAX_RESPONSE_TOKENS,
): { text: string; truncated: boolean } {
  const json = JSON.stringify(data, null, 2);
  const estimatedTokens = json.length / 3;

  if (estimatedTokens <= maxTokens) {
    return { text: json, truncated: false };
  }

  // 配列の場合: 先頭N件に切り詰め
  if (Array.isArray(data)) {
    const totalCount = data.length;
    let items: unknown[] = [];
    let currentLength = 0;
    const targetChars = maxTokens * 3 * 0.8; // 80%の余裕

    for (const item of data) {
      const itemJson = JSON.stringify(item);
      if (currentLength + itemJson.length > targetChars) break;
      items.push(item);
      currentLength += itemJson.length;
    }

    const summary = {
      _summary: `全${totalCount}件中${items.length}件を表示`,
      _totalCount: totalCount,
      results: items,
    };

    return { text: JSON.stringify(summary, null, 2), truncated: true };
  }

  // オブジェクトの場合: 文字数で切り詰め
  const maxChars = maxTokens * 3;
  return {
    text: json.slice(0, maxChars) + "\n... (レスポンスが大きいため省略)",
    truncated: true,
  };
}
