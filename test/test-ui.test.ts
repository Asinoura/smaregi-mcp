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
