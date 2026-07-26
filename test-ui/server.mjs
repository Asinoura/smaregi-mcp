/**
 * smaregi-mcp テスト用APIサーバー
 * MCPサーバーをstdio経由で起動し、JSON-RPCでやりとりする
 * チャット送信 → 意図判定 → 実MCPツール呼び出し → 実データ整形して返答
 */
import { createServer } from "http";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3456;
const HOST = "127.0.0.1";
const MAX_BODY_BYTES = 64 * 1024;

async function readJsonBody(req) {
  let body = "";
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error("リクエストが大きすぎます");
    }
    body += chunk;
  }
  return JSON.parse(body);
}

function isAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  return origin === `http://${HOST}:${PORT}` || origin === `http://localhost:${PORT}`;
}

// ---------- JST日付ユーティリティ ----------

function jstToday() {
  const now = new Date(Date.now() + 9 * 3600000);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return { y, m, d, date: `${y}-${m}-${d}` };
}

function jstDateRange(scope) {
  const { y, m, d, date } = jstToday();
  if (scope === "today") {
    return {
      from: `${date}T00:00:00+09:00`,
      to: `${date}T23:59:59+09:00`,
      label: `${date}（本日）`,
    };
  }
  if (scope === "month") {
    return {
      from: `${y}-${m}-01T00:00:00+09:00`,
      to: `${date}T23:59:59+09:00`,
      label: `${y}年${parseInt(m)}月（1日〜${parseInt(d)}日）`,
    };
  }
  // yesterday
  const yd = new Date(Date.now() + 9 * 3600000 - 86400000);
  const yy = yd.getUTCFullYear();
  const ym = String(yd.getUTCMonth() + 1).padStart(2, "0");
  const ydd = String(yd.getUTCDate()).padStart(2, "0");
  const ydate = `${yy}-${ym}-${ydd}`;
  return {
    from: `${ydate}T00:00:00+09:00`,
    to: `${ydate}T23:59:59+09:00`,
    label: `${ydate}（昨日）`,
  };
}

// ---------- MCP クライアント ----------

class McpClient {
  constructor(serverPath) {
    this.serverPath = serverPath;
    this.requestId = 0;
    this.pending = new Map();
    this.buffer = "";
    this.proc = null;
    this.initialized = false;
  }

  async start() {
    if (this.proc) return;
    this.proc = spawn("node", [this.serverPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.proc.stdout.on("data", (chunk) => {
      this.buffer += chunk.toString();
      const lines = this.buffer.split("\n");
      this.buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id != null && this.pending.has(msg.id)) {
            const { resolve } = this.pending.get(msg.id);
            this.pending.delete(msg.id);
            resolve(msg);
          }
        } catch { /* ignore */ }
      }
    });

    this.proc.stderr.on("data", (chunk) => {
      console.error("[MCP stderr]", chunk.toString());
    });

    this.proc.on("close", (code) => {
      console.log(`[MCP] exited (code ${code})`);
      this.proc = null;
      this.initialized = false;
      for (const [, { reject }] of this.pending) {
        reject(new Error("MCP process exited"));
      }
      this.pending.clear();
    });

    await this.send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-ui", version: "1.0" },
    });
    this.notify("notifications/initialized", {});
    this.initialized = true;
  }

  send(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      this.pending.set(id, { resolve, reject });
      this.proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params, id }) + "\n");
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error("MCP request timeout (30s)"));
        }
      }, 30000);
    });
  }

  notify(method, params) {
    this.proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
  }

  async callTool(name, args = {}) {
    if (!this.initialized) await this.start();
    const resp = await this.send("tools/call", { name, arguments: args });
    return resp.result;
  }

  async listTools() {
    if (!this.initialized) await this.start();
    const resp = await this.send("tools/list", {});
    return resp.result;
  }

  stop() {
    if (this.proc) { this.proc.kill(); this.proc = null; this.initialized = false; }
  }
}

// ---------- 意図判定 ----------

function parseIntent(text) {
  const t = text.trim();

  if (/認証|auth.*status|接続状態/.test(t)) {
    return { intent: "auth_status", tool: "smaregi_auth_status", args: {} };
  }
  if (/サーバー情報|server.*info|バージョン/.test(t)) {
    return { intent: "server_info", tool: "smaregi_server_info", args: {} };
  }
  if (/API.*パス|エンドポイント|パス.*一覧|list.*path|利用可能/.test(t)) {
    return { intent: "list_paths", tool: "smaregi_api_list_paths", args: {} };
  }
  if (/店舗/.test(t)) {
    return { intent: "stores", tool: "smaregi_api_get", args: { path: "/stores" } };
  }
  if (/商品/.test(t)) {
    const m = t.match(/(\d+)/);
    const limit = m ? m[1] : "20";
    return { intent: "products", tool: "smaregi_api_get", args: { path: "/products", query: { limit } } };
  }
  if (/今月.*(売上|取引|transaction)/.test(t)) {
    const r = jstDateRange("month");
    return { intent: "transactions", tool: "smaregi_api_get", args: { path: "/transactions", query: { "transaction_date_time-from": r.from, "transaction_date_time-to": r.to, limit: "1000" } }, meta: { period: r.label } };
  }
  if (/昨日.*(売上|取引|transaction)/.test(t)) {
    const r = jstDateRange("yesterday");
    return { intent: "transactions", tool: "smaregi_api_get", args: { path: "/transactions", query: { "transaction_date_time-from": r.from, "transaction_date_time-to": r.to, limit: "100" } }, meta: { period: r.label } };
  }
  if (/取引|売上|transaction|注文/.test(t)) {
    const r = jstDateRange("today");
    return { intent: "transactions", tool: "smaregi_api_get", args: { path: "/transactions", query: { "transaction_date_time-from": r.from, "transaction_date_time-to": r.to, limit: "100" } }, meta: { period: r.label } };
  }
  if (/会員|顧客|customer/.test(t)) {
    const m = t.match(/(\d+)/);
    return { intent: "customers", tool: "smaregi_api_get", args: { path: "/customers", query: { limit: m ? m[1] : "10" } } };
  }
  if (/スタッフ|staff|従業員/.test(t)) {
    return { intent: "staffs", tool: "smaregi_api_get", args: { path: "/staffs", query: { limit: "50" } } };
  }
  if (/在庫|stock/.test(t)) {
    return { intent: "stock", tool: "smaregi_api_get", args: { path: "/stock", query: { limit: "20" } } };
  }
  if (/カテゴリ|categor/.test(t)) {
    return { intent: "categories", tool: "smaregi_api_get", args: { path: "/categories", query: { limit: "50" } } };
  }

  return null;
}

// ---------- 実データ整形（intent別） ----------

function formatReply(intent, rawText, meta) {
  let data;
  try { data = JSON.parse(rawText); } catch { /* not JSON */ }

  switch (intent) {
    case "auth_status": {
      // rawText はプレーンテキスト（MCP auth_status の出力）
      if (/設定済み|configured|OK/i.test(rawText) || /contractId|契約ID/i.test(rawText)) {
        // clientSecret は表示しない
        const safe = rawText.replace(/clientSecret[:\s]*\S+/gi, "clientSecret: ****");
        return `認証状態: 接続OK\n\n${safe}`;
      }
      return `認証状態: 未設定または NG\n\n${rawText}`;
    }

    case "server_info":
      return rawText;

    case "list_paths":
      return rawText;

    case "stores": {
      if (!Array.isArray(data)) return rawText;
      const lines = data.map((s, i) =>
        `${i + 1}. ${s.storeName || s.store_name || "(名称なし)"} (ID: ${s.storeId || s.store_id || "?"})` +
        (s.storeAddress1 || s.store_address1 ? `\n   住所: ${s.storeAddress1 || s.store_address1 || ""}${s.storeAddress2 || s.store_address2 || ""}` : "") +
        (s.storeTel || s.store_tel ? `\n   TEL: ${s.storeTel || s.store_tel}` : "")
      );
      return `店舗一覧（${data.length}件）\n\n${lines.join("\n\n")}`;
    }

    case "products": {
      if (!Array.isArray(data)) return rawText;
      const lines = data.map((p, i) => {
        const name = p.productName || p.product_name || "(名称なし)";
        const price = p.price ?? p.salesPrice ?? p.sales_price ?? "?";
        const id = p.productId || p.product_id || "?";
        const code = p.productCode || p.product_code || "";
        return `${i + 1}. ${name}　¥${Number(price).toLocaleString()}` +
          `\n   ID: ${id}` + (code ? ` / コード: ${code}` : "");
      });
      return `商品一覧（${data.length}件）\n\n${lines.join("\n")}`;
    }

    case "transactions": {
      const period = meta?.period || "指定期間";
      if (!Array.isArray(data) || data.length === 0) {
        return `取引一覧（${period}）\n\n該当する取引はありません（0件）`;
      }
      const count = data.length;
      const total = data.reduce((sum, tx) => {
        const amt = Number(tx.total ?? tx.amount ?? tx.subtotal ?? 0);
        return sum + amt;
      }, 0);
      const lines = data.slice(0, 10).map((tx, i) => {
        const id = tx.transactionHeadId || tx.transaction_head_id || tx.transactionId || "?";
        const dt = tx.transactionDateTime || tx.transaction_date_time || "";
        const amt = tx.total ?? tx.amount ?? tx.subtotal ?? "?";
        const store = tx.storeName || tx.store_name || "";
        return `${i + 1}. #${id}  ${dt}  ¥${Number(amt).toLocaleString()}${store ? `  (${store})` : ""}`;
      });
      let reply = `取引一覧（${period}）\n\n`;
      reply += `件数: ${count}件\n`;
      reply += `合計金額: ¥${total.toLocaleString()}\n\n`;
      reply += lines.join("\n");
      if (count > 10) reply += `\n\n...他${count - 10}件`;
      return reply;
    }

    case "customers": {
      if (!Array.isArray(data)) return rawText;
      const lines = data.map((c, i) => {
        const name = `${c.lastName || c.last_name || ""}${c.firstName || c.first_name || ""}` || "(名前なし)";
        const id = c.customerId || c.customer_id || "?";
        const code = c.customerCode || c.customer_code || "";
        return `${i + 1}. ${name} (ID: ${id})${code ? ` コード: ${code}` : ""}`;
      });
      return `会員一覧（${data.length}件）\n\n${lines.join("\n")}`;
    }

    case "staffs": {
      if (!Array.isArray(data)) return rawText;
      const lines = data.map((s, i) => {
        const name = s.staffName || s.staff_name || "(名前なし)";
        const id = s.staffId || s.staff_id || "?";
        return `${i + 1}. ${name} (ID: ${id})`;
      });
      return `スタッフ一覧（${data.length}件）\n\n${lines.join("\n")}`;
    }

    case "stock": {
      if (!Array.isArray(data)) return rawText;
      const lines = data.map((s, i) => {
        const name = s.productName || s.product_name || `商品ID:${s.productId || s.product_id || "?"}`;
        const qty = s.stockAmount || s.stock_amount || "?";
        const store = s.storeName || s.store_name || "";
        return `${i + 1}. ${name}  在庫: ${qty}${store ? `  (${store})` : ""}`;
      });
      return `在庫一覧（${data.length}件）\n\n${lines.join("\n")}`;
    }

    case "categories": {
      if (!Array.isArray(data)) return rawText;
      const lines = data.map((c, i) => {
        const name = c.categoryName || c.category_name || "(名称なし)";
        const id = c.categoryId || c.category_id || "?";
        return `${i + 1}. ${name} (ID: ${id})`;
      });
      return `カテゴリ一覧（${data.length}件）\n\n${lines.join("\n")}`;
    }

    default:
      return rawText;
  }
}

// ---------- HTTP サーバー ----------

const mcpServerPath = join(__dirname, "..", "bin", "smaregi-mcp.js");
const mcp = new McpClient(mcpServerPath);

const server = createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Content-Security-Policy", "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'");
  if (!isAllowedOrigin(req)) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "許可されていない送信元です" }));
    return;
  }
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // Static
  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    try {
      const html = readFileSync(join(__dirname, "index.html"), "utf-8");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    } catch { res.writeHead(500); res.end("index.html not found"); }
    return;
  }

  // ツール一覧
  if (req.method === "GET" && req.url === "/api/tools") {
    try {
      const result = await mcp.listTools();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // ツール直接呼び出し
  if (req.method === "POST" && req.url === "/api/call") {
    try {
      const { tool, args } = await readJsonBody(req);
      if (typeof tool !== "string" || !tool.startsWith("smaregi_")) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "ツール名が不正です" }));
        return;
      }
      const result = await mcp.callTool(tool, args);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // チャット: 自然言語 → 実MCPツール呼び出し → 整形して返答
  if (req.method === "POST" && req.url === "/api/chat") {
    try {
      const { message } = await readJsonBody(req);
      if (typeof message !== "string" || message.length === 0 || message.length > 4_000) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "メッセージが不正です" }));
        return;
      }
      const parsed = parseIntent(message);

      if (!parsed) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          reply: `「${message}」に対応するコマンドが見つかりませんでした。\n\n対応コマンド:\n・店舗一覧\n・商品一覧\n・今日の取引 / 今日の売上\n・今月の売上\n・昨日の売上\n・認証状態\n・APIパス一覧\n・カテゴリ一覧\n・スタッフ一覧\n・在庫\n・会員一覧`,
          tool: null, args: null, raw: null, isError: false,
        }));
        return;
      }

      // 実MCPツール呼び出し
      const result = await mcp.callTool(parsed.tool, parsed.args);
      const rawText = result.content?.[0]?.text ?? JSON.stringify(result);
      const isError = result.isError || false;

      // 実データを人間が読める形に整形
      let reply;
      if (isError) {
        reply = `API呼び出しエラー:\n${rawText}`;
      } else {
        reply = formatReply(parsed.intent, rawText, parsed.meta);
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        reply,
        tool: parsed.tool,
        args: parsed.args,
        intent: parsed.intent,
        raw: rawText,
        isError,
      }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // 接続状態
  if (req.method === "GET" && req.url === "/api/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ connected: mcp.initialized, pid: mcp.proc?.pid ?? null }));
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

process.on("SIGINT", () => { mcp.stop(); process.exit(0); });

server.listen(PORT, HOST, () => {
  console.log(`smaregi-mcp テストUI: http://${HOST}:${PORT}`);
  console.log(`MCPサーバー: ${mcpServerPath}`);
  console.log("Ctrl+C で終了");
});
