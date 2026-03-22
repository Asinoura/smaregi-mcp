import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { SearchMatch } from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOMAIN_DIR = path.resolve(
  __dirname,
  "../skills/smaregi-api-skill/domain",
);

export interface EnrichedMatch extends SearchMatch {
  domain_knowledge: string[];
}

// パスとドメインナレッジファイルの対応
const PATH_TO_DOMAIN: Record<string, string[]> = {
  "/transactions": ["transactions.md", "common-patterns.md"],
  "/products": ["products.md"],
  "/stores": [],
  "/stock": ["common-patterns.md"],
};

function loadDomainFile(filename: string): string[] {
  try {
    const filepath = path.join(DOMAIN_DIR, filename);
    const content = fs.readFileSync(filepath, "utf-8");

    // セクション（##で始まる行）ごとに分割し、重要な注意事項を抽出
    const lines = content.split("\n");
    const knowledge: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // ⚠️ で始まる行や重要な注意事項を抽出
      if (trimmed.startsWith("⚠️") || trimmed.startsWith("- ⚠️")) {
        knowledge.push(trimmed.replace(/^-\s*/, ""));
      }
    }

    // 知識が見つからない場合はファイル全体の要約的な行を返す
    if (knowledge.length === 0) {
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("- ") && !trimmed.startsWith("- #")) {
          knowledge.push(trimmed.replace(/^-\s*/, ""));
          if (knowledge.length >= 5) break;
        }
      }
    }

    return knowledge;
  } catch {
    return [];
  }
}

export function injectKnowledge(match: SearchMatch): EnrichedMatch {
  const domainFiles =
    PATH_TO_DOMAIN[match.path] ??
    // パスのプレフィックスでもマッチを試みる
    Object.entries(PATH_TO_DOMAIN)
      .filter(([p]) => match.path.startsWith(p))
      .flatMap(([, files]) => files) ??
    [];

  const knowledge: string[] = [];
  const seen = new Set<string>();

  for (const file of domainFiles) {
    for (const item of loadDomainFile(file)) {
      if (!seen.has(item)) {
        seen.add(item);
        knowledge.push(item);
      }
    }
  }

  return {
    ...match,
    domain_knowledge: knowledge,
  };
}
