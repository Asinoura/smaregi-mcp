import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { SearchMatch } from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOMAIN_DIR = path.resolve(
  __dirname,
  "../skills/smaregi-api-skill/domain",
);

export interface QueryTemplate {
  description: string;
  required_params: Record<string, string>;
  note: string;
}

export interface EnrichedMatch extends SearchMatch {
  domain_knowledge: string[];
  templates?: Record<string, QueryTemplate>;
  aggregation_note?: string;
}

// パスとドメインナレッジファイルの対応
const PATH_TO_DOMAIN: Record<string, string[]> = {
  "/transactions": ["transactions.md", "common-patterns.md"],
  "/transactions/{id}": ["transactions.md"],
  "/transactions/{id}/details": ["transactions.md"],
  "/products": ["products.md"],
  "/stores": ["stores.md"],
  "/stock": ["stock.md", "common-patterns.md"],
  "/customers": ["customers.md"],
  "/categories": ["categories.md"],
  "/daily_summaries": ["daily-summaries.md", "common-patterns.md"],
  "/payment_methods": ["payment-methods.md"],
  "/adjustments": ["common-patterns.md"],
  "/budget/{store_id}": ["common-patterns.md"],
};

// エンドポイント別のコピペ可能なテンプレート
const ENDPOINT_TEMPLATES: Record<string, {
  templates: Record<string, QueryTemplate>;
  aggregation_note?: string;
}> = {
  "/transactions": {
    templates: {
      "純売上を取得": {
        description: "通常取引かつ取消されていない取引のみ取得する（管理画面の売上と一致させるための必須パターン）",
        required_params: {
          "transaction_head_division": "1",
          "cancel_division": "0",
        },
        note: "この2つのパラメータは必須。省略すると取消済み取引や返品・入出金が含まれ、管理画面と数値が一致しない。",
      },
      "期間指定（今月）": {
        description: "今月の取引を取得する",
        required_params: {
          "transaction_date_time-from": "YYYY-MM-01T00:00:00+09:00",
          "transaction_date_time-to": "YYYY-MM-DDT23:59:59+09:00",
        },
        note: "日時パラメータはハイフン区切り（transaction_date_time-from）。アンダースコア(_from)ではない。期間上限は31日間。",
      },
      "商品別売上を取得": {
        description: "取引明細付きで取得し、商品別に集計する",
        required_params: {
          "transaction_head_division": "1",
          "cancel_division": "0",
          "with_details": "all",
        },
        note: "with_details=all時はlimitが100以下に制限される。明細のunitDiscountedSumを商品別に合計する。salesDivision=0の明細のみ集計すること。",
      },
    },
    aggregation_note: "_aggregationのsums.totalを使うこと。個別レコードのtotalを自分で合算しないこと。LLMの合算は不正確（69件で¥100万の誤差が出た実績あり）。",
  },
  "/daily_summaries": {
    templates: {
      "日別売上レポート": {
        description: "締め処理済みの日別売上集計を取得する",
        required_params: {
          "store_id": "(店舗IDを指定)",
        },
        note: "締め処理（status=2）済みのデータのみ取得可能。当日のリアルタイム売上はtransactions APIを使うこと。",
      },
    },
    aggregation_note: "_aggregationのsums.totalが期間合計の純売上。sums.grossMarginが粗利合計。個別レコードを合算しないこと。",
  },
  "/stock": {
    templates: {
      "店舗の在庫確認": {
        description: "特定店舗の全商品在庫を取得する",
        required_params: {
          "store_id": "(店舗IDを指定)",
        },
        note: "在庫変動が発生した商品のみデータが存在する。stockControlDivision=1（在庫管理しない）の商品は含まれない。",
      },
    },
    aggregation_note: "_aggregationのsums.stockAmountが在庫総数。",
  },
};

function loadDomainFile(filename: string): string[] {
  try {
    const filepath = path.join(DOMAIN_DIR, filename);
    const content = fs.readFileSync(filepath, "utf-8");

    const lines = content.split("\n");
    const knowledge: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("⚠️") || trimmed.startsWith("- ⚠️")) {
        knowledge.push(trimmed.replace(/^-\s*/, ""));
      }
    }

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

  const templateDef = ENDPOINT_TEMPLATES[match.path];

  return {
    ...match,
    domain_knowledge: knowledge,
    ...(templateDef ? {
      templates: templateDef.templates,
      aggregation_note: templateDef.aggregation_note,
    } : {}),
  };
}
