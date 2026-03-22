import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { saveTokens, loadTokens, clearTokens, type StoredTokens } from "../../src/auth/token-store.js";

// テスト用のトークンデータ
const testTokens: StoredTokens = {
  contractId: "test-contract-123",
  accessToken: "access-token-abc",
  refreshToken: "refresh-token-xyz",
  expiresAt: Date.now() + 3600000,
  scopes: ["pos.transactions:read", "pos.products:read"],
};

const configDir = path.join(os.homedir(), ".config", "smaregi-mcp");
const tokensFile = path.join(configDir, "tokens.json");

describe("token-store", () => {
  let backupData: string | null = null;

  beforeEach(() => {
    // 既存のトークンファイルをバックアップ
    try {
      backupData = fs.readFileSync(tokensFile, "utf-8");
    } catch {
      backupData = null;
    }
  });

  afterEach(() => {
    // バックアップを復元
    if (backupData !== null) {
      fs.writeFileSync(tokensFile, backupData, { mode: 0o600 });
    } else {
      try {
        fs.unlinkSync(tokensFile);
      } catch {
        // ignore
      }
    }
  });

  it("saveTokens は no-op（ディスクに書き込まない）", () => {
    clearTokens();
    saveTokens(testTokens);
    // saveTokens は v0.5 以降 no-op なのでファイルは作成されない
    expect(loadTokens()).toBeNull();
  });

  it("loadTokens は既存の tokens.json を読み込める", () => {
    // 直接ファイルを書いてloadTokensで読めることを確認
    fs.mkdirSync(path.dirname(tokensFile), { recursive: true });
    fs.writeFileSync(tokensFile, JSON.stringify(testTokens), { mode: 0o600 });
    const loaded = loadTokens();
    expect(loaded).not.toBeNull();
    expect(loaded!.contractId).toBe(testTokens.contractId);
    expect(loaded!.accessToken).toBe(testTokens.accessToken);
    expect(loaded!.refreshToken).toBe(testTokens.refreshToken);
  });

  it("loadTokens はファイルがない場合 null を返す", () => {
    clearTokens();
    const loaded = loadTokens();
    expect(loaded).toBeNull();
  });

  it("clearTokens でトークンを削除できる", () => {
    saveTokens(testTokens);
    clearTokens();
    expect(loadTokens()).toBeNull();
  });
});
