import { MAX_ERROR_BODY_CHARS } from "../constants.js";

/**
 * スマレジから返ったエラー本文を、会話やログに出せる形にする。
 * トークンや秘密情報らしい値を伏せ、長すぎる本文は切り詰める。
 * secrets に渡した値（アクセストークンなど）は、本文のどこにあっても伏せる。
 */
export function sanitizeErrorBody(body: string, secrets: (string | undefined)[] = []): string {
  let text = body;
  for (const secret of secrets) {
    if (secret && secret.length >= 4) text = text.split(secret).join("***");
  }
  text = text
    // JSON の "access_token": "..." など
    .replace(
      /("(?:access_token|refresh_token|id_token|client_secret|token)"\s*:\s*")(?:[^"\\]|\\.)*"/gi,
      '$1***"'
    )
    // フォーム形式の access_token=... など
    .replace(/\b(access_token|refresh_token|id_token|client_secret)=[^&\s"']+/gi, "$1=***")
    // Authorization ヘッダーの値
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 ***")
    // JWT らしい値
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, "***");
  if (text.length > MAX_ERROR_BODY_CHARS) {
    text = `${text.slice(0, MAX_ERROR_BODY_CHARS)}…（${text.length - MAX_ERROR_BODY_CHARS}文字省略）`;
  }
  return text;
}

/** fetch がタイムアウトで止まったか */
export function isTimeoutError(e: unknown): boolean {
  return e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
}
