/**
 * エラーメッセージから機密情報をマスクする
 */
export function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, "Bearer [MASKED]")
    .replace(/Basic\s+[A-Za-z0-9+/]+=*/g, "Basic [MASKED]")
    .replace(/"access_token"\s*:\s*"[^"]+"/g, '"access_token": "[MASKED]"')
    .replace(/"refresh_token"\s*:\s*"[^"]+"/g, '"refresh_token": "[MASKED]"')
    .replace(/"client_secret"\s*:\s*"[^"]+"/g, '"client_secret": "[MASKED]"');
}
