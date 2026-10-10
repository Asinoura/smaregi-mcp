import type { Config } from "../config/schema.js";

/**
 * LLM が指定する API パスを確かめる。
 * `/products/123` のような `/` 始まりの相対パスだけを受け付け、`..` や `//`、`?`・`#` で
 * `/{契約ID}/pos` の外（別の契約や別のホスト）へ出られないようにする。
 */
export function validateApiPath(path: string): void {
  const reject = (reason: string): never => {
    throw new Error(`APIパスが不正です（${reason}）: ${JSON.stringify(String(path).slice(0, 200))}`);
  };
  if (typeof path !== "string" || !path.startsWith("/")) reject("/ から始めてください");
  if (path.includes("//")) reject("// は使えません");
  if (/[?#\\]/.test(path)) reject("? # \\ は使えません。クエリは query で渡してください");
  // 空白や制御文字（0x00〜0x20 と 0x7f）
  if (/[\x00-\x20\x7f]/.test(path)) reject("空白や制御文字は使えません");
  for (const segment of path.slice(1).split("/")) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return reject("% の書き方が正しくありません");
    }
    if (decoded === "." || decoded === "..") reject(". や .. は使えません");
    if (/[/\\?#]/.test(decoded)) reject("エンコードした / \\ ? # は使えません");
  }
}

/** 契約IDを確かめて、URL の部品としてエンコードする */
export function encodeContractId(contractId: string): string {
  if (!contractId) {
    throw new Error("契約IDが未設定です。smaregi_configure か SMAREGI_CONTRACT_ID 環境変数で設定してください。");
  }
  const encoded = encodeURIComponent(contractId);
  if (encoded === "." || encoded === "..") {
    throw new Error("契約IDが不正です");
  }
  return encoded;
}

/** API の URL を組み立て、`{apiHost}/{契約ID}/pos/` の下に収まっていることを確かめる */
export function buildApiUrl(config: Config, path: string): URL {
  validateApiPath(path);
  const base = new URL(config.apiHost);
  const prefix = `${base.pathname.replace(/\/+$/, "")}/${encodeContractId(config.contractId)}/pos`;
  const url = new URL(`${base.origin}${prefix}${path}`);
  if (url.origin !== base.origin || !url.pathname.startsWith(`${prefix}/`)) {
    throw new Error(`APIパスが /pos の外を指しています: ${JSON.stringify(path.slice(0, 200))}`);
  }
  return url;
}
