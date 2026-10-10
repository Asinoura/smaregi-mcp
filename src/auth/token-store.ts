import { createHash } from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import { getConfigDir } from "../config/config.js";
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
  const dir = getConfigDir();
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  await fs.chmod(dir, 0o700);
  const tokenPath = path.join(dir, "tokens.json");
  await fs.writeFile(tokenPath, JSON.stringify(token, null, 2), {
    encoding: "utf-8",
    mode: 0o600,
  });
  await fs.chmod(tokenPath, 0o600);
}
