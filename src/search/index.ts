import { endpoints, type EndpointDefinition } from "../validation/schema-registry.js";

export interface SearchMatch {
  endpoint: string;
  method: string;
  description: string;
  path: string;
  parameters: Record<string, unknown>;
  tags: string[];
}

export function searchEndpoints(query: string): SearchMatch[] {
  const keywords = query
    .toLowerCase()
    .split(/[\s　]+/)
    .filter((k) => k.length > 0);

  if (keywords.length === 0) return [];

  const scored: Array<{ match: SearchMatch; score: number }> = [];

  for (const [path, def] of Object.entries(endpoints)) {
    const searchText = [
      path,
      def.description,
      ...def.tags,
      ...def.keywords,
    ]
      .join(" ")
      .toLowerCase();

    let score = 0;
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        score += 1;
        // 完全一致のタグはボーナス
        if (def.tags.some((t) => t.toLowerCase() === keyword)) {
          score += 0.5;
        }
      }
    }

    if (score > 0) {
      const paramEntries: Record<string, unknown> = {};
      if (def.paramsSchema) {
        // Zodスキーマから説明を抽出
        const shape = def.paramsSchema;
        for (const [key, schema] of Object.entries(shape)) {
          paramEntries[key] = {
            type: "parameter",
            description: (schema as { description?: string }).description ?? "",
          };
        }
      }

      scored.push({
        match: {
          endpoint: `${def.method} /pos${path}`,
          method: def.method,
          description: def.description,
          path,
          parameters: paramEntries,
          tags: def.tags,
        },
        score,
      });
    }
  }

  // スコア降順、上位5件
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5).map((s) => s.match);
}
