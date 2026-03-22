import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { smaregiRequest } from "../api/client.js";
import { validateParams } from "../validation/validator.js";
import { truncateResponse } from "../api/client.js";
import { computeAggregation, type AggregationOptions } from "../api/aggregation.js";
import { sanitizeErrorMessage } from "../utils/sanitize.js";
import { needsSplitting, fetchWithPeriodSplitting, computeCoveredMonths } from "../api/period-splitter.js";

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
      const fromParam = params["transaction_date_time-from"] as string | undefined;
      const toParam = params["transaction_date_time-to"] as string | undefined;

      // 期間自動分割: /transactions GET で31日超えの場合
      if (
        args.path === "/transactions" &&
        args.method === "GET" &&
        fromParam && toParam &&
        needsSplitting(fromParam, toParam)
      ) {
        const splitResult = await fetchWithPeriodSplitting(
          args.path,
          params,
          smaregiRequest,
        );

        const aggOptions: AggregationOptions = {
          coveredPeriod: splitResult.coveredPeriod,
          coveredMonths: splitResult.coveredMonths,
          apiCalls: splitResult.apiCalls,
          monthlyBreakdown: splitResult.monthlyBreakdown,
          isPartialResult: splitResult.failedChunks.length > 0,
        };

        const aggregation = computeAggregation(splitResult.data, aggOptions);

        // 失敗チャンクがあれば note に追記
        if (aggregation && splitResult.failedChunks.length > 0) {
          const failedPeriods = splitResult.failedChunks
            .map((c) => `${c.from} 〜 ${c.to}`)
            .join(", ");
          aggregation.note += ` 取得に失敗した期間: ${failedPeriods}`;
        }

        // サンプル5件のみ返す（トークン節約）
        const samples = splitResult.data.slice(0, 5);

        const response = {
          _aggregation: aggregation,
          samples,
        };

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(response, null, 2),
          }],
        };
      }

      // 通常フロー（31日以内 or 期間指定なし）
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
      const aggOptions: AggregationOptions = {};
      if (args.path === "/transactions" && fromParam && toParam) {
        aggOptions.coveredPeriod = { from: fromParam, to: toParam };
        aggOptions.coveredMonths = computeCoveredMonths(fromParam, toParam);
        aggOptions.apiCalls = 1;
      }
      const aggregation = computeAggregation(data, aggOptions);

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
