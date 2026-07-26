import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { CONFIG_DIR_NAME } from "../constants.js";
import { ConfigSchema, type Config } from "./schema.js";

/** 設定ディレクトリのパスを取得 */
export function getConfigDir(): string {
  return path.join(os.homedir(), ".config", CONFIG_DIR_NAME);
}

/** 設定ファイルを読み込み（環境変数でフォールバック） */
export async function loadConfig(): Promise<Config> {
  const configPath = path.join(getConfigDir(), "config.json");

  let fileConfig: Record<string, unknown> = {};
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    fileConfig = JSON.parse(raw);
  } catch {
    // ファイルがなければ環境変数のみで構成
  }

  const merged = {
    contractId: fileConfig.contractId ?? process.env.SMAREGI_CONTRACT_ID ?? "",
    clientId: fileConfig.clientId ?? process.env.SMAREGI_CLIENT_ID,
    // クライアントシークレットはディスクから読まず、環境変数だけを信頼する。
    clientSecret: process.env.SMAREGI_CLIENT_SECRET,
    idpHost: fileConfig.idpHost ?? process.env.SMAREGI_IDP_HOST,
    apiHost: fileConfig.apiHost ?? process.env.SMAREGI_API_HOST,
    scopes: fileConfig.scopes,
  };

  return ConfigSchema.parse(merged);
}

/** 設定ファイルを保存 */
export async function saveConfig(config: Config): Promise<void> {
  const dir = getConfigDir();
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const configPath = path.join(dir, "config.json");
  const { clientSecret: _clientSecret, ...safeConfig } = config;
  await fs.writeFile(configPath, JSON.stringify(safeConfig, null, 2), {
    encoding: "utf-8",
    mode: 0o600,
  });
}
