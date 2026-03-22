import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

export interface StoredTokens {
  contractId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt: number;
  scopes: string[];
  clientId?: string;
  clientSecret?: string;
}

const TOKENS_FILE = path.join(os.homedir(), ".config", "smaregi-mcp", "tokens.json");

export function saveTokens(tokens: StoredTokens): void {
  // v0.5 以降はトークンやクライアントシークレットをディスクへ保存しない。
  // 旧バージョンが残した tokens.json は loadTokens() で後方互換的に読める。
  void tokens;
  clearTokens();
}

export function loadTokens(): StoredTokens | null {
  try {
    const data = fs.readFileSync(TOKENS_FILE, "utf-8");
    return JSON.parse(data) as StoredTokens;
  } catch {
    return null;
  }
}

export function clearTokens(): void {
  try {
    fs.unlinkSync(TOKENS_FILE);
  } catch {
    // ファイルがなければ無視
  }
}
