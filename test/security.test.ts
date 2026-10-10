// 監査（2026-10-10）で見つかった問題が直っていることを確かめる。
// 設定ファイルは一時ディレクトリの HOME に作り、スマレジへの通信は fetch の差し替えで代用する（外へは通信しない）。
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { registerTools } from "../src/tools/register-all.js";
import { loadConfig, saveConfig } from "../src/config/config.js";
import { saveToken } from "../src/auth/token-store.js";
import { apiRequest } from "../src/api/client.js";
import { buildApiUrl } from "../src/api/url.js";
import { sanitizeErrorBody } from "../src/api/errors.js";
import { DEFAULT_SCOPES, DEFAULT_WRITE_SCOPES, MAX_ERROR_BODY_CHARS } from "../src/constants.js";
import type { Config } from "../src/config/schema.js";

const ENV_KEYS = [
  "HOME",
  "USERPROFILE",
  "SMAREGI_CONTRACT_ID",
  "SMAREGI_CLIENT_ID",
  "SMAREGI_CLIENT_SECRET",
  "SMAREGI_IDP_HOST",
  "SMAREGI_API_HOST",
  "SMAREGI_ENABLE_MUTATIONS",
];

const SECRET = "dummy-secret-value";
const ACCESS_TOKEN = "ACCESS_TOKEN_abcdef123456";

type Call = { url: string; init?: RequestInit };
type ApiResponder = (url: string, init?: RequestInit) => Response | Promise<Response>;

let savedEnv: Record<string, string | undefined>;
let savedFetch: typeof globalThis.fetch;
let home: string;
let calls: Call[];
let apiResponder: ApiResponder;
let tokenResponder: () => Response;

beforeEach(async () => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  home = await fs.mkdtemp(path.join(os.tmpdir(), "smaregi-mcp-security-"));
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  process.env.SMAREGI_CONTRACT_ID = "contractA";
  process.env.SMAREGI_CLIENT_ID = "clientA";
  process.env.SMAREGI_CLIENT_SECRET = SECRET;

  calls = [];
  tokenResponder = () =>
    new Response(JSON.stringify({ access_token: ACCESS_TOKEN, expires_in: 3600, token_type: "Bearer" }), {
      status: 200,
    });
  apiResponder = () => new Response("[]", { status: 200 });
  savedFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    return /\/token$/.test(url) ? tokenResponder() : apiResponder(url, init);
  }) as typeof globalThis.fetch;
});

afterEach(async () => {
  globalThis.fetch = savedFetch;
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  await fs.rm(home, { recursive: true, force: true });
});

const configDir = () => path.join(home, ".config", "smaregi-mcp");

async function writeConfigFile(content: Record<string, unknown>): Promise<void> {
  await fs.mkdir(configDir(), { recursive: true });
  await fs.writeFile(path.join(configDir(), "config.json"), JSON.stringify(content));
}

function tokenRequestScopes(): string[] {
  const tokenCall = calls.find((c) => /\/token$/.test(c.url));
  assert.ok(tokenCall, "トークンを取りに行っていない");
  const scope = new URLSearchParams(String(tokenCall.init?.body)).get("scope") ?? "";
  return scope.split(" ");
}

// ---- 変更系ツールのオプトイン ----

function registeredToolNames(): string[] {
  const names: string[] = [];
  registerTools({ tool: (name: string) => void names.push(name) } as never);
  return names;
}

const WRITE_TOOLS = ["smaregi_api_post", "smaregi_api_put", "smaregi_api_patch", "smaregi_api_delete"];

test("変更系ツールは SMAREGI_ENABLE_MUTATIONS=true のときだけ登録する", () => {
  const readOnly = registeredToolNames();
  assert.ok(readOnly.includes("smaregi_api_get"));
  for (const name of WRITE_TOOLS) assert.ok(!readOnly.includes(name), `${name} が既定で登録されている`);

  // true 以外の値では有効にしない
  process.env.SMAREGI_ENABLE_MUTATIONS = "1";
  for (const name of WRITE_TOOLS) assert.ok(!registeredToolNames().includes(name), `${name} が "1" で登録された`);

  process.env.SMAREGI_ENABLE_MUTATIONS = "true";
  const all = registeredToolNames();
  for (const name of WRITE_TOOLS) assert.ok(all.includes(name), `${name} が登録されていない`);
});

test("既定では読み取りスコープだけでトークンを取る", async () => {
  const config = await loadConfig();
  assert.deepEqual(config.scopes, DEFAULT_SCOPES);
  for (const scope of config.scopes) assert.match(scope, /:read$/);

  await apiRequest(config, "GET", "/stores");
  assert.deepEqual(tokenRequestScopes(), DEFAULT_SCOPES);
});

test("変更系を有効にしていなければ、config.json に書き込みスコープがあっても要求しない", async () => {
  // 以前の版の configure は書き込みスコープを含む既定値を config.json に書いていた
  await writeConfigFile({ contractId: "contractA", scopes: ["pos.products:read", "pos.products:write"] });
  assert.deepEqual((await loadConfig()).scopes, ["pos.products:read"]);

  // 書き込みスコープしかなくても、空のスコープ（アプリに許可された全スコープになり得る）では取らない
  await writeConfigFile({ contractId: "contractA", scopes: ["pos.products:write"] });
  assert.deepEqual((await loadConfig()).scopes, DEFAULT_SCOPES);
});

test("SMAREGI_ENABLE_MUTATIONS=true なら書き込みスコープも要求する", async () => {
  process.env.SMAREGI_ENABLE_MUTATIONS = "true";
  assert.deepEqual((await loadConfig()).scopes, [...DEFAULT_SCOPES, ...DEFAULT_WRITE_SCOPES]);

  // config.json でスコープを指定していれば、その通りにする
  await writeConfigFile({ contractId: "contractA", scopes: ["pos.stock:read", "pos.stock:write"] });
  assert.deepEqual((await loadConfig()).scopes, ["pos.stock:read", "pos.stock:write"]);
});

// ---- API パスの検証 ----

function testConfig(overrides: Partial<Config> = {}): Config {
  return {
    contractId: "contractA",
    clientId: "clientA",
    clientSecret: SECRET,
    idpHost: "https://id.example.test",
    apiHost: "https://api.example.test",
    scopes: [...DEFAULT_SCOPES],
    ...overrides,
  };
}

test("API パスは /{契約ID}/pos の下だけを指せる", () => {
  for (const [p, expected] of [
    ["/products", "/contractA/pos/products"],
    ["/products/123", "/contractA/pos/products/123"],
    ["/transactions/1/details", "/contractA/pos/transactions/1/details"],
    ["/products/", "/contractA/pos/products/"],
  ]) {
    const url = buildApiUrl(testConfig(), p);
    assert.equal(url.origin, "https://api.example.test");
    assert.equal(url.pathname, expected);
    assert.equal(url.search, "");
  }
});

test("API パスで /pos の外や別のホストへは出られない", async () => {
  const bad = [
    "products",
    "/../contractB/pos/products",
    "/products/../../../contractB/pos/customers",
    "/products/./x",
    "/%2e%2e/%2E%2E/contractB/pos/products",
    "/.%2e/x",
    "/products%2f..%2f..%2fcontractB",
    "//evil.example/products",
    "/products//x",
    "/products?limit=1",
    "/products#x",
    "/products\\..\\x",
    "/products x",
    "/products\n",
    "/%zz",
    "http://evil.example/products",
  ];
  for (const p of bad) {
    assert.throws(() => buildApiUrl(testConfig(), p), /APIパス/, `受け付けてしまった: ${JSON.stringify(p)}`);
    await assert.rejects(apiRequest(testConfig(), "GET", p), /APIパス/);
  }
  // 不正なパスではトークンも取りに行かない
  assert.equal(calls.length, 0);
});

test("契約IDは URL の部品としてエンコードし、空や .. は使わない", async () => {
  assert.equal(buildApiUrl(testConfig({ contractId: "a/b" }), "/products").pathname, "/a%2Fb/pos/products");
  assert.throws(() => buildApiUrl(testConfig({ contractId: ".." }), "/products"), /契約ID/);
  assert.throws(() => buildApiUrl(testConfig({ contractId: "" }), "/products"), /契約ID/);

  // トークンの URL でもエンコードする
  await apiRequest(testConfig({ contractId: "x/../y" }), "GET", "/products");
  assert.equal(calls[0].url, "https://id.example.test/app/x%2F..%2Fy/token");
  assert.equal(new URL(calls[1].url).pathname, "/x%2F..%2Fy/pos/products");
});

// ---- エラー本文のマスクとタイムアウト ----

test("API のエラー本文はトークンを伏せ、長さを切り詰める", async () => {
  apiResponder = () =>
    new Response(`echo: Bearer ${ACCESS_TOKEN} raw=${ACCESS_TOKEN} ${"x".repeat(5000)}`, { status: 400 });
  const error = await apiRequest(testConfig(), "GET", "/products").then(
    () => assert.fail("エラーにならなかった"),
    (e: Error) => e
  );
  assert.match(error.message, /400/);
  assert.ok(!error.message.includes(ACCESS_TOKEN), "アクセストークンがエラーに残っている");
  assert.ok(error.message.length < MAX_ERROR_BODY_CHARS + 200, `エラーが長すぎる: ${error.message.length}`);
  assert.match(error.message, /文字省略/);
});

test("トークン取得のエラー本文はクライアントシークレットを伏せる", async () => {
  tokenResponder = () =>
    new Response(JSON.stringify({ error: "invalid_client", client_secret: SECRET, detail: `got ${SECRET}` }), {
      status: 401,
    });
  const error = await apiRequest(testConfig(), "GET", "/products").then(
    () => assert.fail("エラーにならなかった"),
    (e: Error) => e
  );
  assert.match(error.message, /401/);
  assert.match(error.message, /invalid_client/);
  assert.ok(!error.message.includes(SECRET), "クライアントシークレットがエラーに残っている");
});

test("sanitizeErrorBody はトークンらしい値を伏せる", () => {
  const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl";
  const text = sanitizeErrorBody(
    `{"access_token":"tok\\"en1","refresh_token":"r1"} access_token=t2&x=1 Authorization: Basic YWJjOmRlZg== ${jwt}`
  );
  for (const leaked of ['tok\\"en1', "r1", "t2", "YWJjOmRlZg==", jwt]) {
    assert.ok(!text.includes(leaked), `${leaked} が残っている: ${text}`);
  }
  assert.match(text, /x=1/);
});

test("スマレジへの通信にはタイムアウトを付け、止まったら分かるエラーにする", async () => {
  await apiRequest(testConfig(), "GET", "/products");
  assert.equal(calls.length, 2);
  for (const c of calls) assert.ok(c.init?.signal instanceof AbortSignal, `${c.url} にタイムアウトがない`);

  apiResponder = () => {
    throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
  };
  await assert.rejects(apiRequest(testConfig(), "GET", "/products"), /秒以内に応答しませんでした/);
});

// ---- 設定・トークンファイルの権限とシンボリックリンク ----

const posixOnly = { skip: process.platform === "win32" ? "POSIX のファイル権限だけを確かめる" : false };

async function mode(p: string): Promise<number> {
  return (await fs.lstat(p)).mode & 0o777;
}

test("トークンと設定は 0700 のディレクトリに 0600 で書き、既存の緩い権限も直す", posixOnly, async () => {
  await fs.mkdir(configDir(), { recursive: true, mode: 0o755 });
  await fs.chmod(configDir(), 0o755);
  const tokenPath = path.join(configDir(), "tokens.json");
  await fs.writeFile(tokenPath, "{}", { mode: 0o644 });
  await fs.chmod(tokenPath, 0o644);

  await saveToken({ access_token: "t", expires_in: 3600, token_type: "Bearer", obtained_at: Date.now() });
  await saveConfig({ contractId: "contractA", clientId: "clientA" });

  assert.equal(await mode(configDir()), 0o700);
  assert.equal(await mode(tokenPath), 0o600);
  assert.equal(await mode(path.join(configDir(), "config.json")), 0o600);
  assert.equal(JSON.parse(await fs.readFile(tokenPath, "utf-8")).access_token, "t");
});

test("tokens.json や config.json がシンボリックリンクなら、リンク先を上書きしない", posixOnly, async () => {
  await fs.mkdir(configDir(), { recursive: true });
  const victim = path.join(home, "victim.txt");
  await fs.writeFile(victim, "keep");
  await fs.symlink(victim, path.join(configDir(), "tokens.json"));
  await fs.symlink(victim, path.join(configDir(), "config.json"));

  await assert.rejects(
    saveToken({ access_token: "t", expires_in: 3600, token_type: "Bearer", obtained_at: Date.now() }),
    /シンボリックリンク/
  );
  await assert.rejects(saveConfig({ contractId: "contractA" }), /シンボリックリンク/);
  assert.equal(await fs.readFile(victim, "utf-8"), "keep");
});

test("設定ディレクトリがシンボリックリンクなら書き込まない", posixOnly, async () => {
  const elsewhere = path.join(home, "elsewhere");
  await fs.mkdir(elsewhere);
  await fs.mkdir(path.dirname(configDir()), { recursive: true });
  await fs.symlink(elsewhere, configDir());

  await assert.rejects(saveConfig({ contractId: "contractA" }), /シンボリックリンク/);
  assert.deepEqual(await fs.readdir(elsewhere), []);
});
