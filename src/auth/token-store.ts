import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

export interface StoredTokens {
  contractId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
}

const CONFIG_DIR = path.join(os.homedir(), ".config", "smaregi-mcp");
const TOKENS_FILE = path.join(CONFIG_DIR, "tokens.json");

export function saveTokens(tokens: StoredTokens): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), {
    mode: 0o600,
  });
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
