import { z } from "zod";
import { endpoints } from "./schema-registry.js";

export interface ValidationResult {
  success: boolean;
  error?: string;
  validated?: Record<string, unknown>;
}

export function validateParams(
  path: string,
  params: Record<string, unknown>,
): ValidationResult {
  const endpoint = endpoints[path];

  if (!endpoint) {
    // 未知のエンドポイントはバリデーションスキップ
    return { success: true, validated: params };
  }

  if (!endpoint.paramsSchema) {
    // スキーマなしのエンドポイントはパラメータなしが正しい
    if (Object.keys(params).length > 0) {
      return {
        success: false,
        error: `${path} はパラメータを受け付けません`,
      };
    }
    return { success: true, validated: params };
  }

  // 未知のパラメータをチェック（typo防止）
  const knownKeys = new Set(Object.keys(endpoint.paramsSchema));
  const unknownKeys = Object.keys(params).filter((k) => !knownKeys.has(k));

  if (unknownKeys.length > 0) {
    const available = Array.from(knownKeys).join(", ");
    return {
      success: false,
      error: `不明なパラメータ: ${unknownKeys.join(", ")}。利用可能なパラメータ: ${available}`,
    };
  }

  // Zodスキーマで各パラメータをバリデーション
  const schema = z.object(
    endpoint.paramsSchema as Record<string, z.ZodType>,
  ).partial();

  const result = schema.safeParse(params);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    return { success: false, error: errors };
  }

  return { success: true, validated: result.data as Record<string, unknown> };
}
