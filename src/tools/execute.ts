import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { smaregiRequest } from "../api/client.js";
import { validateParams } from "../validation/validator.js";
import { truncateResponse } from "../api/client.js";
import { computeAggregation } from "../api/aggregation.js";
import { sanitizeErrorMessage } from "../utils/sanitize.js";

function normalizeParams(
  path: string,
  params: Record<string, unknown>,
): Record<string, unknown> {
  if (path !== "/transactions") {
    return params;
  }

  const normalized = { ...params };

  if ("transaction_date_time_from" in normalized && !("transaction_date_time-from" in normalized)) {
    normalized["transaction_date_time-from"] = normalized.transaction_date_time_from;
    delete normalized.transaction_date_time_from;
  }

  if ("transaction_date_time_to" in normalized && !("transaction_date_time-to" in normalized)) {
    normalized["transaction_date_time-to"] = normalized.transaction_date_time_to;
    delete normalized.transaction_date_time_to;
  }

  if (typeof normalized.transaction_head_division === "number") {
    normalized.transaction_head_division = String(normalized.transaction_head_division);
  }

  if (typeof normalized.cancel_division === "number") {
    normalized.cancel_division = String(normalized.cancel_division);
  }

  // /transactions は offset 非対応のため、AI が付けても無視する
  if ("offset" in normalized) {
    delete normalized.offset;
  }

  return normalized;
}

export function registerExecuteTool(server: McpServer): void {
  server.registerTool("execute", {
    description:
      "スマレジAPIを実行します。search_toolsで確認したエンドポイントを指定してください。パラメータはZodスキーマで検証され、不正な値はエラーになります。",
    inputSchema: {
      method: z
        .enum(["GET", "POST", "PUT", "DELETE"])
        .default("GET")
        .describe("HTTPメソッド"),
      path: z.string().describe("APIパス（例: /transactions, /products）"),
      params: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("クエリパラメータまたはリクエストボディ"),
    },
  }, async (args) => {
    const params = normalizeParams(args.path, args.params ?? {});

    // パラメータバリデーション
    const validation = validateParams(args.path, params);
    if (!validation.success) {
      return {
        content: [{
          type: "text" as const,
          text: `パラメータエラー: ${validation.error}`,
        }],
        isError: true,
      };
    }

    try {
      const queryString =
        args.method === "GET" && params
          ? "?" +
            new URLSearchParams(
              Object.entries(params)
                .filter(([, v]) => v != null)
                .map(([k, v]) => [k, String(v)]),
            ).toString()
          : "";

      const body =
        args.method !== "GET" && params
          ? JSON.stringify(params)
          : undefined;

      const data = await smaregiRequest(`${args.path}${queryString}`, {
        method: args.method,
        body,
      });

      // 配列データの場合は集計メタデータを計算（truncate前に実行）
      const aggregation = computeAggregation(data);

      const { text, truncated } = truncateResponse(data);

      // _aggregation + data の構造でレスポンスを組み立て
      let responseText: string;
      if (aggregation && aggregation.sums && Object.keys(aggregation.sums).length > 0) {
        const response = {
          _aggregation: aggregation,
          data: JSON.parse(text),
        };
        responseText = JSON.stringify(response, null, 2);
      } else {
        responseText = text;
      }

      if (truncated) {
        responseText = `⚠️ 結果が大きいため要約しました。\n\n${responseText}`;
      }

      return {
        content: [{
          type: "text" as const,
          text: responseText,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text" as const,
          text: `API実行エラー: ${sanitizeErrorMessage(error instanceof Error ? error.message : String(error))}`,
        }],
        isError: true,
      };
    }
  });
}
