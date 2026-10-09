// 契約やホストを切り替えたときに、古いホスト設定とトークンが残らないことを確かめる。
// 設定ファイルは一時ディレクトリの HOME に作り、スマレジへの通信は fetch の差し替えで代用する。
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { register as registerConfigure } from "../src/tools/configure.js";
import { register as registerAuthStatus } from "../src/tools/auth-status.js";
import { loadConfig } from "../src/config/config.js";
import { getAccessToken } from "../src/auth/token-manager.js";

type ToolResult = { content: { type: string; text: string }[] };
type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;

function captureHandler(register: (server: never) => void): ToolHandler {
  let handler: ToolHandler | undefined;
  const fakeServer = {
    tool: (_name: string, _description: string, _schema: unknown, h: ToolHandler) => {
      handler = h;
    },
  };
  register(fakeServer as never);
  if (!handler) throw new Error("ツールが登録されませんでした");
  return handler;
}

const configure = captureHandler(registerConfigure);
const authStatus = captureHandler(registerAuthStatus);

const ENV_KEYS = [
  "HOME",
  "USERPROFILE",
  "SMAREGI_CONTRACT_ID",
  "SMAREGI_CLIENT_ID",
  "SMAREGI_CLIENT_SECRET",
  "SMAREGI_IDP_HOST",
  "SMAREGI_API_HOST",
];

let savedEnv: Record<string, string | undefined>;
let savedFetch: typeof globalThis.fetch;
let home: string;
let tokenRequests: string[];

beforeEach(async () => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  home = await fs.mkdtemp(path.join(os.tmpdir(), "smaregi-mcp-test-"));
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  process.env.SMAREGI_CLIENT_SECRET = "dummy-secret";

  tokenRequests = [];
  savedFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    tokenRequests.push(url);
    const contract = /\/app\/([^/]+)\/token$/.exec(url)?.[1] ?? "unknown";
    const body = {
      access_token: `TOKEN_FOR_${contract}_${tokenRequests.length}`,
      expires_in: 3600,
      token_type: "Bearer",
    };
    return new Response(JSON.stringify(body), { status: 200 });
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

async function readConfigFile(): Promise<unknown> {
  const raw = await fs.readFile(path.join(home, ".config", "smaregi-mcp", "config.json"), "utf-8");
  return JSON.parse(raw);
}

async function currentToken(): Promise<string> {
  return getAccessToken(await loadConfig());
}

async function statusText(): Promise<string> {
  const result = await authStatus({});
  return result.content[0].text;
}

test("configure はホストとスコープを config.json に書かず、環境変数のホストが効く", async () => {
  process.env.SMAREGI_IDP_HOST = "https://id.example.test";
  process.env.SMAREGI_API_HOST = "https://api.example.test";

  await configure({ contract_id: "contractA", client_id: "clientA" });

  assert.deepEqual(await readConfigFile(), { contractId: "contractA", clientId: "clientA" });
  const config = await loadConfig();
  assert.equal(config.idpHost, "https://id.example.test");
  assert.equal(config.apiHost, "https://api.example.test");
});

test("以前の版が書いた config.json は、configure をもう一度実行すると環境変数のホストが効く", async () => {
  const dir = path.join(home, ".config", "smaregi-mcp");
  await fs.mkdir(dir, { recursive: true });
  // 以前の版の configure は既定のサンドボックスのホストとスコープも書き込んでいた
  const defaults = await loadConfig();
  await fs.writeFile(
    path.join(dir, "config.json"),
    JSON.stringify({
      contractId: "contractA",
      clientId: "clientA",
      idpHost: defaults.idpHost,
      apiHost: defaults.apiHost,
      scopes: defaults.scopes,
    })
  );
  process.env.SMAREGI_IDP_HOST = "https://id.example.test";
  process.env.SMAREGI_API_HOST = "https://api.example.test";

  // ファイルの値が環境変数より優先されるので、そのままではサンドボックスのまま（README に案内がある）
  assert.equal((await loadConfig()).idpHost, defaults.idpHost);

  await configure({ contract_id: "contractA", client_id: "clientA" });
  const config = await loadConfig();
  assert.equal(config.idpHost, "https://id.example.test");
  assert.equal(config.apiHost, "https://api.example.test");
});

test("configure で契約を切り替えると、前の契約のトークンを使わない", async () => {
  await configure({ contract_id: "contractA", client_id: "clientA" });
  const tokenA = await currentToken();
  assert.match(tokenA, /^TOKEN_FOR_contractA_/);
  // 設定が同じあいだはキャッシュを使い回す
  assert.equal(await currentToken(), tokenA);
  assert.equal(tokenRequests.length, 1);

  await configure({ contract_id: "contractB", client_id: "clientB" });
  assert.match(await currentToken(), /^TOKEN_FOR_contractB_/);
  assert.equal(tokenRequests.length, 2);
});

test("config.json がなく環境変数だけを変えたときも、前のトークンを使わない", async () => {
  process.env.SMAREGI_CONTRACT_ID = "contractA";
  process.env.SMAREGI_CLIENT_ID = "clientA";
  assert.match(await currentToken(), /^TOKEN_FOR_contractA_/);

  process.env.SMAREGI_CONTRACT_ID = "contractB";
  assert.match(await currentToken(), /^TOKEN_FOR_contractB_/);
  assert.equal(tokenRequests.length, 2);

  process.env.SMAREGI_CLIENT_ID = "clientB";
  await currentToken();
  assert.equal(tokenRequests.length, 3);

  process.env.SMAREGI_IDP_HOST = "https://id.example.test";
  await currentToken();
  assert.equal(tokenRequests.length, 4);
  assert.equal(tokenRequests[3], "https://id.example.test/app/contractB/token");

  process.env.SMAREGI_API_HOST = "https://api.example.test";
  await currentToken();
  assert.equal(tokenRequests.length, 5);
});

test("config.json のスコープを変えたら、前のトークンを使わない", async () => {
  await configure({ contract_id: "contractA", client_id: "clientA" });
  await currentToken();
  assert.equal(tokenRequests.length, 1);

  const configPath = path.join(home, ".config", "smaregi-mcp", "config.json");
  const saved = (await readConfigFile()) as Record<string, unknown>;
  await fs.writeFile(configPath, JSON.stringify({ ...saved, scopes: ["pos.stores:read"] }));
  await currentToken();
  assert.equal(tokenRequests.length, 2);
});

test("config.json のスコープの順番を入れ替えただけなら、トークンを取り直さない", async () => {
  await configure({ contract_id: "contractA", client_id: "clientA" });
  const token = await currentToken();
  assert.equal(tokenRequests.length, 1);

  // 同じスコープを逆の順番で書く。キャッシュのキーはスコープを並べ替えてから作るので、同じ設定として扱う
  const reversed = [...(await loadConfig()).scopes].reverse();
  const configPath = path.join(home, ".config", "smaregi-mcp", "config.json");
  const saved = (await readConfigFile()) as Record<string, unknown>;
  await fs.writeFile(configPath, JSON.stringify({ ...saved, scopes: reversed }));
  assert.deepEqual((await loadConfig()).scopes, reversed);

  assert.equal(await currentToken(), token);
  assert.equal(tokenRequests.length, 1);
});

test("どの設定で取ったか分からない保存済みトークンは使わない", async () => {
  await configure({ contract_id: "contractA", client_id: "clientA" });
  const dir = path.join(home, ".config", "smaregi-mcp");
  await fs.writeFile(
    path.join(dir, "tokens.json"),
    JSON.stringify({ access_token: "OLD_TOKEN", expires_in: 3600, token_type: "Bearer", obtained_at: Date.now() }),
    { mode: 0o600 }
  );

  // 同じ設定で取ったかもしれないので「別の設定」とは言い切らず、以前の版のトークンとして案内する
  const text = await statusText();
  assert.doesNotMatch(text, /状態: 有効/);
  assert.doesNotMatch(text, /別の設定/);
  assert.match(text, /以前の版/);

  assert.match(await currentToken(), /^TOKEN_FOR_contractA_/);
  assert.equal(tokenRequests.length, 1);
});

test("smaregi_auth_status は別の契約で取ったトークンを「有効」と表示しない", async () => {
  await configure({ contract_id: "contractA", client_id: "clientA" });
  await currentToken();
  assert.match(await statusText(), /状態: 有効/);

  await configure({ contract_id: "contractB", client_id: "clientB" });
  const text = await statusText();
  assert.doesNotMatch(text, /状態: 有効/);
  assert.match(text, /別の設定/);

  await currentToken();
  assert.match(await statusText(), /状態: 有効/);
});
