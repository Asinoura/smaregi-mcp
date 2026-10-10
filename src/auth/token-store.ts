import { createHash } from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import { getConfigDir, writePrivateFile } from "../config/config.js";
import { TokenSchema, type Config, type Token } from "../config/schema.js";

/**
 * トークンを取得したときの設定を表すキー。
 * ホスト・契約ID・クライアントID・スコープのどれかが変わったら、別のトークンとして扱う。
 */
export function tokenCacheKey(config: Config): string {
  const parts = [
    config.idpHost,
    config.apiHost,
    config.contractId,
    config.clientId ?? "",
    [...config.scopes].sort(),
  ];
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

/** 保存済みトークンを読み込み（なければnull） */
export async function loadToken(): Promise<Token | null> {
  const tokenPath = path.join(getConfigDir(), "tokens.json");
  try {
    const raw = await fs.readFile(tokenPath, "utf-8");
    return TokenSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** トークンを保存 */
export async function saveToken(token: Token): Promise<void> {
  await writePrivateFile("tokens.json", JSON.stringify(token, null, 2));
}
