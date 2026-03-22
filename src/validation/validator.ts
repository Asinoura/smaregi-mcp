import { z } from "zod";
import { endpoints } from "./schema-registry.js";

export interface ValidationResult {
  success: boolean;
  error?: string;
  validated?: Record<string, unknown>;
}

/**
 * Zodバリデーション前にパラメータの型を自動変換する。
 * AIが数値を文字列で渡したり、文字列を数値で渡すケースを救済し、リトライを減らす。
 */
function coerceParams(
  params: Record<string, unknown>,
  schema: Record<string, z.ZodType>,
): Record<string, unknown> {
  const coerced: Record<string, unknown> = { ...params };

  for (const [key, value] of Object.entries(coerced)) {
    const zodSchema = schema[key];
    if (!zodSchema) continue;

    // Zodスキーマの内部構造から期待される型を推定
    const def = (zodSchema as unknown as { _zod?: { def?: { type?: string; innerType?: unknown } } })._zod?.def;
    const typeName = def?.type;

    if (typeName === "number" && typeof value === "string") {
      // 文字列 → 数値（例: "100" → 100）
      const num = Number(value);
      if (!isNaN(num)) {
        coerced[key] = num;
      }
    } else if (typeName === "string" && typeof value === "number") {
      // 数値 → 文字列（例: 1 → "1"）
      coerced[key] = String(value);
    } else if (typeName === "enum" && typeof value === "number") {
      // enum に数値が来た場合 → 文字列に変換（例: 1 → "1"）
      coerced[key] = String(value);
    } else if (typeName === "optional" || typeName === "default") {
      // optional/default ラッパーの中の型を見る
      const innerDef = (def?.innerType as { _zod?: { def?: { type?: string } } })?._zod?.def;
      const innerType = innerDef?.type;

      if (innerType === "number" && typeof value === "string") {
        const num = Number(value);
        if (!isNaN(num)) {
          coerced[key] = num;
        }
      } else if ((innerType === "string" || innerType === "enum") && typeof value === "number") {
        coerced[key] = String(value);
      }
    }
  }

  return coerced;
}

export function validateParams(
  path: string,
  params: Record<string, unknown>,
): ValidationResult {
  const endpoint = endpoints[path];

  if (!endpoint) {
    return { success: true, validated: params };
  }

  if (!endpoint.paramsSchema) {
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

  // 型の自動変換（AIの型ミスを救済）
  const coerced = coerceParams(params, endpoint.paramsSchema);

  // Zodスキーマでバリデーション
  const schema = z.object(
    endpoint.paramsSchema as Record<string, z.ZodType>,
  ).partial();

  const result = schema.safeParse(coerced);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    return { success: false, error: errors };
  }

  return { success: true, validated: result.data as Record<string, unknown> };
}
