// テストUIが CSP（default-src 'self'）の下でも動く形になっていることを確かめる。
// インラインのスクリプト・スタイル・onclick は CSP で止められ、ボタンが反応しなくなる。
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const uiDir = fileURLToPath(new URL("../test-ui/", import.meta.url));
const html = readFileSync(join(uiDir, "index.html"), "utf-8");

test("index.html にインラインのスクリプト・スタイル・イベント属性がない", () => {
  assert.doesNotMatch(html, /<style[\s>]/i, "<style> 要素がある");
  for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {
    assert.match(m[1], /\bsrc=/i, `インラインの <script> がある: ${m[0]}`);
  }
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i, "onclick などのイベント属性がある");
  assert.doesNotMatch(html, /\sstyle\s*=/i, "style 属性がある");
});

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const address = srv.address();
      const port = typeof address === "object" && address ? address.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

async function fetchWhenReady(url: string, timeoutMs = 5000): Promise<Response> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      return await fetch(url);
    } catch (e) {
      if (Date.now() > deadline) throw e;
      await new Promise((r) => setTimeout(r, 100));
    }
  }
}

test("テストUIのサーバーが、CSP を緩めずに画面の読むファイルを配る", async (t) => {
  const port = await freePort();
  // MCP サーバーは起動しない（静的ファイルだけを読む）が、念のため HOME を一時ディレクトリにし、
  // スマレジの認証情報の環境変数は渡さない。
  const home = mkdtempSync(join(tmpdir(), "smaregi-test-ui-"));
  const child = spawn(process.execPath, [join(uiDir, "server.mjs")], {
    env: { PATH: process.env.PATH, HOME: home, SMAREGI_TEST_UI_PORT: String(port) },
    stdio: "ignore",
  });
  t.after(() => {
    child.kill();
    rmSync(home, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${port}`;

  const page = await fetchWhenReady(`${base}/`);
  assert.equal(page.status, 200);
  const csp = page.headers.get("content-security-policy") ?? "";
  assert.match(csp, /default-src 'self'/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|nonce-/);

  const assets = [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/gi)].map((m) => m[1]);
  assert.deepEqual(assets.sort(), ["/app.js", "/style.css"]);

  for (const [assetPath, type] of [
    ["/app.js", "text/javascript"],
    ["/style.css", "text/css"],
  ]) {
    const r = await fetch(`${base}${assetPath}`);
    assert.equal(r.status, 200, assetPath);
    assert.match(r.headers.get("content-type") ?? "", new RegExp(`^${type};`), assetPath);
    assert.equal(await r.text(), readFileSync(join(uiDir, assetPath.slice(1)), "utf-8"));
  }
});

// ---- app.js のイベント登録 ----
// ブラウザの代わりに、app.js を node:vm で最小限の偽の DOM の上で動かす。
// 画面の要素は index.html の id とクイックボタンから作り、送信は fetch の差し替えで記録する（外へは通信しない）。

type Listener = (event: Record<string, unknown>) => void;

class FakeElement {
  listeners = new Map<string, Listener[]>();
  dataset: Record<string, string> = {};
  value = "";
  disabled = false;
  className = "";
  innerHTML = "";
  textContent = "";
  scrollTop = 0;
  scrollHeight = 0;
  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  dispatch(type: string, event: Record<string, unknown> = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
  appendChild(child: FakeElement) {
    return child;
  }
  remove() {}
  focus() {}
}

function loadApp() {
  const byId = new Map([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => [m[1], new FakeElement()]));
  const quickButtons = [...html.matchAll(/<button\b[^>]*\bclass="qbtn"[^>]*\bdata-prompt="([^"]+)"/g)].map((m) => {
    const button = new FakeElement();
    button.dataset.prompt = m[1];
    return button;
  });
  const sent: string[] = [];
  const document = {
    // ブラウザと同じく、ない id には null を返す
    getElementById: (id: string) => byId.get(id) ?? null,
    querySelectorAll: (selector: string) => {
      if (selector !== ".qbtn[data-prompt]") throw new Error(`偽の DOM が対応していないセレクター: ${selector}`);
      return quickButtons;
    },
    createElement: () => new FakeElement(),
  };
  const fetch = async (url: string, init?: { body?: string }) => {
    if (url === "/api/chat") sent.push(JSON.parse(init?.body ?? "{}").message);
    return { json: async () => (url === "/api/chat" ? { reply: "ok" } : { connected: false }) };
  };
  runInNewContext(readFileSync(join(uiDir, "app.js"), "utf-8"), { document, fetch, setInterval: () => 0 }, {
    filename: "app.js",
  });
  const input = byId.get("input");
  const button = byId.get("btn");
  if (!input || !button) throw new Error("index.html に入力欄か送信ボタンがない");
  return { input, button, quickButtons, sent };
}

/** send() の await のあとの処理を終わらせる */
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("app.js：クイックボタンを押すと、そのボタンの文言を送る", async () => {
  const { quickButtons, sent } = loadApp();
  assert.ok(quickButtons.length > 0, "index.html にクイックボタンがない");
  for (const b of quickButtons) {
    b.dispatch("click");
    await settle();
  }
  assert.deepEqual(sent, quickButtons.map((b) => b.dataset.prompt));
});

test("app.js：入力欄で Enter を押すと送る（変換中の Enter とほかのキーでは送らない）", async () => {
  const { input, sent } = loadApp();
  input.value = "サーバー情報";
  input.dispatch("keydown", { key: "Enter", isComposing: true });
  input.dispatch("keydown", { key: "a", isComposing: false });
  await settle();
  assert.deepEqual(sent, []);

  input.dispatch("keydown", { key: "Enter", isComposing: false });
  await settle();
  assert.deepEqual(sent, ["サーバー情報"]);
  assert.equal(input.value, "");
});

test("app.js：送信ボタンを押すと、入力欄の文言を送る", async () => {
  const { input, button, sent } = loadApp();
  input.value = "認証状態を確認して";
  button.dispatch("click");
  await settle();
  assert.deepEqual(sent, ["認証状態を確認して"]);
});
