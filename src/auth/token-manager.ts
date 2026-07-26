import { TOKEN_REFRESH_BUFFER_SECONDS } from "../constants.js";
import type { Config, Token } from "../config/schema.js";
import { loadToken, saveToken } from "./token-store.js";

/** トークンが有効かチェック */
function isTokenValid(token: Token): boolean {
  const expiresAt = token.obtained_at + token.expires_in * 1000;
  const now = Date.now();
  return now < expiresAt - TOKEN_REFRESH_BUFFER_SECONDS * 1000;
}

/** 新規トークンを取得 */
async function fetchNewToken(config: Config): Promise<Token> {
  if (!config.clientId || !config.clientSecret) {
    throw new Error(
      "clientId または clientSecret が未設定です。clientId は smaregi_configure、clientSecret は SMAREGI_CLIENT_SECRET 環境変数で設定してください。"
    );
  }

  const url = `${config.idpHost}/app/${config.contractId}/token`;
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=client_credentials&scope=${encodeURIComponent(config.scopes.join(" "))}`,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`トークン取得に失敗しました (${response.status}): ${body}`);
  }

  const data = await response.json();
  const token: Token = {
    access_token: data.access_token,
    expires_in: data.expires_in,
    token_type: data.token_type,
    obtained_at: Date.now(),
  };

  await saveToken(token);
  return token;
}

/** アクセストークンを取得（キャッシュ有効なら再利用） */
export async function getAccessToken(config: Config): Promise<string> {
  const cached = await loadToken();
  if (cached && isTokenValid(cached)) {
    return cached.access_token;
  }
  const token = await fetchNewToken(config);
  return token.access_token;
}
