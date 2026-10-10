import { constants as fsConstants } from "fs";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { CONFIG_DIR_NAME, DEFAULT_SCOPES, DEFAULT_WRITE_SCOPES } from "../constants.js";
import { mutationsEnabled } from "../tools/mutation-guard.js";
import { ConfigSchema, type Config, type ConfigInput } from "./schema.js";

/** 設定ディレクトリのパスを取得 */
export function getConfigDir(): string {
  return path.join(os.homedir(), ".config", CONFIG_DIR_NAME);
}

/**
 * 要求するスコープを決める。
 * 変更系を有効にしていないときは、config.json に書き込みスコープがあっても読み取りスコープだけを要求する。
 * 変更系を有効にしていて config.json にスコープがなければ、既定の読み取りと書き込みのスコープを要求する。
 */
function resolveScopes(configured: string[] | undefined): string[] {
  if (!mutationsEnabled()) {
    const readOnly = (configured ?? DEFAULT_SCOPES).filter((s) => s.endsWith(":read"));
    // 空のまま送るとアプリに許可された全スコープが付く恐れがあるので、既定の読み取りスコープにする
    return readOnly.length > 0 ? readOnly : [...DEFAULT_SCOPES];
  }
  if (configured && configured.length > 0) return configured;
  return [...DEFAULT_SCOPES, ...DEFAULT_WRITE_SCOPES];
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

  const config = ConfigSchema.parse(merged);
  return { ...config, scopes: resolveScopes(merged.scopes === undefined ? undefined : config.scopes) };
}

/** 設定ディレクトリを 0700 で用意する。シンボリックリンクやディレクトリ以外のものなら使わない */
async function ensureConfigDir(): Promise<string> {
  const dir = getConfigDir();
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const stat = await fs.lstat(dir);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error(`${dir} がシンボリックリンクかディレクトリではないため、書き込みません`);
  }
  await fs.chmod(dir, 0o700);
  return dir;
}

/**
 * 設定ディレクトリの中のファイルを 0600 で書く。
 * シンボリックリンクはたどらない（たどると、リンク先の別のファイルを上書きしてしまう）。
 */
export async function writePrivateFile(name: string, content: string): Promise<void> {
  const dir = await ensureConfigDir();
  const filePath = path.join(dir, name);
  try {
    const stat = await fs.lstat(filePath);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw new Error(`${filePath} がシンボリックリンクか通常のファイルではないため、書き込みません`);
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  // 確認と書き込みのあいだに差し替えられても、O_NOFOLLOW でリンクを開かない（対応していない OS では 0）
  const flags =
    fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_TRUNC | (fsConstants.O_NOFOLLOW ?? 0);
  const handle = await fs.open(filePath, flags, 0o600);
  try {
    // 既存のファイルが 0644 などでも、中身を書く前に 0600 に直す
    await handle.chmod(0o600);
    await handle.writeFile(content, "utf-8");
  } finally {
    await handle.close();
  }
}

/** 設定ファイルを保存 */
export async function saveConfig(config: ConfigInput): Promise<void> {
  const { clientSecret: _clientSecret, ...safeConfig } = config;
  await writePrivateFile("config.json", JSON.stringify(safeConfig, null, 2));
}
