import { saveTokens } from "./token-store.js";
import { state } from "../state.js";
import { sanitizeErrorMessage } from "../utils/sanitize.js";

const SCOPES = "pos.transactions:read pos.products:read pos.stores:read pos.stock:read";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/** トークンエンドポイントURLを構築 */
function getTokenUrl(contractId: string): string {
  // sandbox: id.smaregi.dev, production: id.smaregi.jp
  const host = process.env.SMAREGI_ENV === "production"
    ? "id.smaregi.jp"
    : "id.smaregi.dev";
  return `https://${host}/app/${encodeURIComponent(contractId)}/token`;
}

/** client_credentials grant でトークンを取得 */
export async function startAuthFlow(
  clientId: string,
  clientSecret: string,
  contractId: string,
): Promise<AuthTokens> {
  const tokenUrl = getTokenUrl(contractId);
  const basicCredential = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${basicCredential}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: SCOPES,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`トークン取得失敗 (${res.status}): ${sanitizeErrorMessage(text)}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;

  const tokens: AuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? "",
    expiresAt: Date.now() + expiresIn * 1000,
  };

  saveTokens({
    contractId,
    expiresAt: tokens.expiresAt,
    scopes: SCOPES.split(" "),
  });

  return tokens;
}

/** client_credentials で再取得 */
export async function refreshAccessToken(): Promise<AuthTokens> {
  if (!state.clientId || !state.clientSecret || !state.contractId) {
    throw new Error("クライアント情報がありません。再認証してください。");
  }

  const tokens = await startAuthFlow(
    state.clientId,
    state.clientSecret,
    state.contractId,
  );

  state.accessToken = tokens.accessToken;
  state.refreshToken = tokens.refreshToken;
  state.tokenExpiresAt = tokens.expiresAt;

  return tokens;
}

export async function ensureAuth(): Promise<void> {
  if (!state.accessToken) {
    throw new Error("未認証です。authenticateツールで認証してください。");
  }

  if (state.tokenExpiresAt && state.tokenExpiresAt < Date.now()) {
    await refreshAccessToken();
  }
}
