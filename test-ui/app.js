// CSP（default-src 'self'）でインラインのスクリプトと onclick は動かないため、別ファイルにしてイベントをここで登録する
const msgsEl = document.getElementById("messages");
const rawEl = document.getElementById("rawBody");
const rawMetaEl = document.getElementById("rawMeta");
const logEl = document.getElementById("logBody");
const inputEl = document.getElementById("input");
const btnEl = document.getElementById("btn");

// --- Helpers ---
function esc(s) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function time() { return new Date().toLocaleTimeString("ja-JP"); }

function addMsg(html, cls, meta) {
  const el = document.createElement("div");
  el.className = `msg ${cls}`;
  el.innerHTML = html;
  if (meta) {
    const m = document.createElement("div");
    m.className = "msg-meta";
    m.textContent = meta;
    el.appendChild(m);
  }
  msgsEl.appendChild(el);
  msgsEl.scrollTop = msgsEl.scrollHeight;
  return el;
}

function addLog(text, cls) {
  const e = document.createElement("div");
  e.className = "log-entry";
  e.innerHTML = `<span class="t">[${time()}]</span> <span class="${cls || ''}">${esc(text)}</span>`;
  logEl.appendChild(e);
  logEl.scrollTop = logEl.scrollHeight;
}

// --- Status ---
async function checkStatus() {
  try {
    const r = await fetch("/api/status");
    const d = await r.json();
    const el = document.getElementById("status");
    const txt = document.getElementById("statusText");
    if (d.connected) {
      el.className = "status-badge status-connected";
      txt.textContent = `MCP接続中 (PID: ${d.pid})`;
    } else {
      el.className = "status-badge status-disconnected";
      txt.textContent = "未接続（初回リクエストで自動接続）";
    }
  } catch {
    document.getElementById("status").className = "status-badge status-disconnected";
    document.getElementById("statusText").textContent = "サーバー停止";
  }
}

// --- Send ---
async function send(text) {
  if (!text) {
    text = inputEl.value.trim();
    if (!text) return;
  }
  inputEl.value = "";
  addMsg(esc(text), "msg-user");
  btnEl.disabled = true;

  const loadEl = addMsg("実行中...", "msg-loading");
  addLog(`送信: ${text}`, "");

  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const d = await r.json();
    loadEl.remove();

    if (d.error) {
      addMsg(esc(d.error), "msg-error");
      addLog(`ERROR: ${d.error}`, "err");
      return;
    }

    // チャット返答（実データ整形済み）
    const metaStr = d.tool ? `${d.tool} ${JSON.stringify(d.args)}` : null;
    addMsg(esc(d.reply), d.isError ? "msg-error" : "msg-bot", metaStr);

    // ログ
    if (d.tool) {
      addLog(`${d.tool} → ${d.isError ? "ERROR" : "OK"} [${d.intent}]`, d.isError ? "err" : "ok");
    }

    // 右パネルに生レスポンス表示
    if (d.raw) {
      let display = d.raw;
      try { display = JSON.stringify(JSON.parse(d.raw), null, 2); } catch {}
      rawEl.textContent = display;
      rawMetaEl.textContent = d.tool ? `${d.tool} | ${d.intent} | ${time()}` : "";
    }

    checkStatus();
  } catch (e) {
    loadEl.remove();
    addMsg(`通信エラー: ${esc(e.message)}`, "msg-error");
    addLog(`通信エラー: ${e.message}`, "err");
  } finally {
    btnEl.disabled = false;
    inputEl.focus();
  }
}

// --- Events ---
for (const b of document.querySelectorAll(".qbtn[data-prompt]")) {
  b.addEventListener("click", () => send(b.dataset.prompt));
}
inputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.isComposing) send();
});
btnEl.addEventListener("click", () => send());

// Init
checkStatus();
setInterval(checkStatus, 10000);
inputEl.focus();
