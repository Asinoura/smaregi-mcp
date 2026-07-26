import * as fs from "fs/promises";
import * as path from "path";
import { getConfigDir } from "../config/config.js";
import { TokenSchema, type Token } from "../config/schema.js";

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
  const tokenPath = path.join(dir, "tokens.json");
  await fs.writeFile(tokenPath, JSON.stringify(token, null, 2), {
    encoding: "utf-8",
    mode: 0o600,
  });
}
