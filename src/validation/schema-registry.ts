import { z } from "zod";

export interface EndpointDefinition {
  method: string;
  description: string;
  tags: string[];
  keywords: string[];
  paramsSchema: Record<string, z.ZodType> | null;
}

export const endpoints: Record<string, EndpointDefinition> = {
  "/stores": {
    method: "GET",
    description: "店舗一覧を取得します",
    tags: ["stores", "店舗"],
    keywords: ["店舗", "店", "store", "ストア", "一覧"],
    paramsSchema: {
      limit: z.number().int().min(1).max(1000).optional().describe("取得件数上限"),
      offset: z.number().int().min(0).optional().describe("取得開始位置"),
    },
  },

  "/transactions": {
    method: "GET",
    description: "取引一覧を取得します。売上データの取得に使用します。",
    tags: ["transactions", "取引", "売上"],
    keywords: [
      "取引", "売上", "会計", "レジ", "transaction", "sales",
      "日次", "月次", "集計", "純売上", "返品", "取消",
    ],
    paramsSchema: {
      transaction_head_division: z
        .enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"])
        .optional()
        .describe(
          "取引区分: 1=通常, 2=返品, 3=取消, 4=値引き, 5=入金, 6=出金, 7=券売, 8=棚卸, 9=予約, 10=受注",
        ),
      cancel_division: z
        .enum(["0", "1"])
        .optional()
        .describe("取消区分: 0=通常, 1=取消済み"),
      "transaction_date_time-from": z
        .string()
        .optional()
        .describe("取引日時FROM（例: 2024-01-01T00:00:00+09:00）"),
      "transaction_date_time-to": z
        .string()
        .optional()
        .describe("取引日時TO（例: 2024-01-31T23:59:59+09:00）"),
      store_id: z.string().optional().describe("店舗ID"),
      terminal_id: z.string().optional().describe("端末ID"),
      with_details: z
        .enum(["none", "summary", "all"])
        .optional()
        .describe("明細の取得レベル: none=なし, summary=概要, all=全て"),
      limit: z.number().int().min(1).max(1000).optional().describe("取得件数上限"),
      offset: z.number().int().min(0).optional().describe("取得開始位置"),
    },
  },

  "/transactions/{id}": {
    method: "GET",
    description: "取引詳細を取得します。特定の取引IDの詳細データを返します。",
    tags: ["transactions", "取引詳細"],
    keywords: ["取引詳細", "取引", "明細", "transaction", "detail"],
    paramsSchema: {
      with_details: z
        .enum(["none", "summary", "all"])
        .optional()
        .describe("明細の取得レベル"),
    },
  },

  "/products": {
    method: "GET",
    description: "商品一覧を取得します。商品マスタの検索に使用します。",
    tags: ["products", "商品"],
    keywords: [
      "商品", "プロダクト", "product", "アイテム", "item",
      "カテゴリ", "部門", "価格", "税",
    ],
    paramsSchema: {
      category_id: z.string().optional().describe("カテゴリID"),
      product_code: z.string().optional().describe("商品コード"),
      product_name: z.string().optional().describe("商品名（部分一致）"),
      is_displayed: z
        .enum(["0", "1"])
        .optional()
        .describe("表示フラグ: 0=非表示, 1=表示"),
      limit: z.number().int().min(1).max(1000).optional().describe("取得件数上限"),
      offset: z.number().int().min(0).optional().describe("取得開始位置"),
    },
  },

  "/stock": {
    method: "GET",
    description: "在庫一覧を取得します。プレミアムプラン以上で利用可能です。",
    tags: ["stock", "在庫"],
    keywords: ["在庫", "ストック", "stock", "棚卸", "数量"],
    paramsSchema: {
      store_id: z.string().optional().describe("店舗ID"),
      product_id: z.string().optional().describe("商品ID"),
      product_code: z.string().optional().describe("商品コード"),
      limit: z.number().int().min(1).max(1000).optional().describe("取得件数上限"),
      offset: z.number().int().min(0).optional().describe("取得開始位置"),
    },
  },
};
