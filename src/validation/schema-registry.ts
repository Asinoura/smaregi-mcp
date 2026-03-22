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
    keywords: ["店舗", "店", "store", "ストア", "一覧", "多店舗", "倉庫"],
    paramsSchema: {
      store_code: z.string().optional().describe("店舗コード"),
      division: z.enum(["1", "2"]).optional().describe("店舗区分: 1=通常店舗, 2=倉庫"),
      with_point_condition: z.enum(["all", "none"]).optional().describe("ポイント設定付加"),
      with_receipt_print_info: z.enum(["all", "none"]).optional().describe("レシート印刷情報付加"),
      limit: z.number().int().min(1).optional().describe("取得件数上限"),
      page: z.number().int().min(1).optional().describe("ページ番号"),
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
        .enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "11", "13", "14", "15", "16"])
        .optional()
        .describe(
          "取引区分: 1=通常, 2=返品, 3=取消, 4=預かり金, 5=預かり金返金, 6=回数券, 7=券売, 8=入金, 9=出金, 11=仮販売, 13=領収証発行, 14=取置き, 15=引取, 16=領収証",
        ),
      cancel_division: z
        .enum(["0", "1"])
        .optional()
        .describe("取消区分: 0=通常, 1=取消済み。純売上集計時は必ず0を指定すること"),
      "transaction_date_time-from": z
        .string()
        .optional()
        .describe("取引日時FROM（例: 2024-01-01T00:00:00+09:00）最大31日範囲"),
      "transaction_date_time-to": z
        .string()
        .optional()
        .describe("取引日時TO（例: 2024-01-31T23:59:59+09:00）最大31日範囲"),
      store_id: z.string().optional().describe("店舗ID"),
      terminal_id: z.string().optional().describe("端末ID"),
      customer_code: z.string().optional().describe("会員コード"),
      "sum_date": z.string().optional().describe("締め日 YYYY-MM-DD"),
      "sum_date-from": z.string().optional().describe("締め日FROM YYYY-MM-DD 最大31日範囲"),
      "sum_date-to": z.string().optional().describe("締め日TO YYYY-MM-DD 最大31日範囲"),
      "terminal_tran_date_time-from": z.string().optional().describe("端末取引日時FROM 最大31日範囲"),
      "terminal_tran_date_time-to": z.string().optional().describe("端末取引日時TO 最大31日範囲"),
      "upd_date_time-from": z.string().optional().describe("更新日時FROM 最大31日範囲"),
      "upd_date_time-to": z.string().optional().describe("更新日時TO 最大31日範囲"),
      with_details: z
        .enum(["none", "summary", "all"])
        .optional()
        .describe("明細の取得レベル: none=なし, summary=概要, all=全て（all/summary時はlimit100以下）"),
      with_deposit_others: z.enum(["all", "none"]).optional().describe("その他支払方法: all/none"),
      with_money_control: z.enum(["all", "none"]).optional().describe("金銭管理情報: all/none"),
      sort: z.string().optional().describe("並び順"),
      limit: z.number().int().min(1).max(1000).optional().describe("取得件数上限（with_details非none時は100以下）"),
      page: z.number().int().min(1).optional().describe("ページ番号"),
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
      with_deposit_others: z.enum(["all", "none"]).optional().describe("その他支払方法"),
    },
  },

  "/transactions/{id}/details": {
    method: "GET",
    description: "取引明細一覧を取得します。商品別の売上詳細を確認できます。",
    tags: ["transactions", "取引明細", "明細"],
    keywords: ["取引明細", "明細", "商品別", "detail", "商品売上"],
    paramsSchema: {
      with_discounts: z.enum(["all", "none"]).optional().describe("値引区分情報: all/none"),
      with_detail_product_attributes: z.enum(["all", "none"]).optional().describe("商品属性情報: all/none"),
      limit: z.number().int().min(1).optional().describe("取得件数上限"),
      page: z.number().int().min(1).optional().describe("ページ番号"),
    },
  },

  "/products": {
    method: "GET",
    description: "商品一覧を取得します。商品マスタの検索に使用します。",
    tags: ["products", "商品"],
    keywords: [
      "商品", "プロダクト", "product", "アイテム", "item",
      "カテゴリ", "部門", "価格", "税", "バーコード",
    ],
    paramsSchema: {
      category_id: z.string().optional().describe("部門ID"),
      product_code: z.string().optional().describe("商品コード（完全一致）"),
      group_code: z.string().optional().describe("グループコード"),
      display_flag: z.enum(["0", "1"]).optional().describe("端末表示: 0=非表示, 1=表示"),
      division: z.enum(["0", "1", "2"]).optional().describe("商品区分: 0=通常, 1=回数券, 2=オプション"),
      sales_division: z.enum(["0", "1"]).optional().describe("売上区分: 0=対象, 1=対象外"),
      stock_control_division: z.enum(["0", "1"]).optional().describe("在庫管理: 0=する, 1=しない"),
      "upd_date_time-from": z.string().optional().describe("更新日時FROM 最大31日範囲"),
      "upd_date_time-to": z.string().optional().describe("更新日時TO 最大31日範囲"),
      limit: z.number().int().min(1).optional().describe("取得件数上限"),
      page: z.number().int().min(1).optional().describe("ページ番号"),
    },
  },

  "/stock": {
    method: "GET",
    description: "在庫一覧を取得します。在庫変動が発生した商品のみデータが存在します。",
    tags: ["stock", "在庫"],
    keywords: ["在庫", "ストック", "stock", "棚卸", "数量", "欠品"],
    paramsSchema: {
      store_id: z.string().optional().describe("店舗ID"),
      product_id: z.string().optional().describe("商品ID"),
      "upd_date_time-from": z.string().optional().describe("更新日時FROM 最大31日範囲"),
      "upd_date_time-to": z.string().optional().describe("更新日時TO 最大31日範囲"),
      limit: z.number().int().min(1).optional().describe("取得件数上限"),
      page: z.number().int().min(1).optional().describe("ページ番号"),
    },
  },

  "/customers": {
    method: "GET",
    description: "会員一覧を取得します。プレミアムプラス以上で利用可能です。",
    tags: ["customers", "会員", "顧客"],
    keywords: ["会員", "顧客", "customer", "メンバー", "ポイント", "ランク", "来店"],
    paramsSchema: {
      customer_code: z.string().optional().describe("会員コード"),
      "customer_id-from": z.string().optional().describe("会員ID範囲FROM"),
      "customer_id-to": z.string().optional().describe("会員ID範囲TO"),
      customer_no: z.string().optional().describe("会員番号"),
      "upd_date_time-from": z.string().optional().describe("更新日時FROM 最大31日範囲"),
      "upd_date_time-to": z.string().optional().describe("更新日時TO 最大31日範囲"),
      limit: z.number().int().min(1).optional().describe("取得件数上限"),
      page: z.number().int().min(1).optional().describe("ページ番号"),
    },
  },

  "/categories": {
    method: "GET",
    description: "部門一覧を取得します。商品の分類情報です。",
    tags: ["categories", "部門", "カテゴリ"],
    keywords: ["部門", "カテゴリ", "category", "分類", "階層"],
    paramsSchema: {
      category_code: z.string().optional().describe("部門コード"),
      level: z.enum(["1", "2", "3"]).optional().describe("階層レベル: 1=大分類, 2=中分類, 3=小分類"),
      limit: z.number().int().min(1).optional().describe("取得件数上限"),
      page: z.number().int().min(1).optional().describe("ページ番号"),
    },
  },

  "/daily_summaries": {
    method: "GET",
    description: "日次締め情報を取得します。日別の売上集計データです。締め処理済みのデータのみ取得可能です。",
    tags: ["dailySummaries", "日次締め", "集計"],
    keywords: [
      "日次", "締め", "集計", "日別", "summary", "レポート",
      "純売上", "粗利", "現金", "過不足",
    ],
    paramsSchema: {
      sum_date: z.string().optional().describe("締め日 YYYY-MM-DD"),
      store_id: z.string().optional().describe("店舗ID"),
      cash_drawer_id: z.string().optional().describe("キャッシュドロアID"),
      limit: z.number().int().min(1).max(100).optional().describe("取得件数上限（最大100）"),
      page: z.number().int().min(1).optional().describe("ページ番号"),
    },
  },

  "/payment_methods": {
    method: "GET",
    description: "支払方法一覧を取得します。決済方法の設定情報です。",
    tags: ["paymentMethods", "支払方法", "決済"],
    keywords: ["支払", "決済", "payment", "クレジット", "電子マネー", "現金", "QR"],
    paramsSchema: {
      payment_method_code: z.string().optional().describe("支払方法コード"),
      display_flag: z.enum(["0", "1"]).optional().describe("表示フラグ: 0=非表示, 1=表示"),
      change_flag: z.enum(["0", "1"]).optional().describe("お釣り: 0=なし, 1=あり"),
      payment_method_group_id: z.string().optional().describe("分類ID"),
      securities_flag: z.enum(["0", "1"]).optional().describe("商品券: 0=以外, 1=商品券"),
      payment_methods_scope: z.enum(["all", "registered"]).optional().describe("all=外部連携含む, registered=登録済みのみ"),
      limit: z.number().int().min(1).optional().describe("取得件数上限"),
      page: z.number().int().min(1).optional().describe("ページ番号"),
    },
  },

  "/adjustments": {
    method: "GET",
    description: "精算情報を取得します。日次の現金精算データです。",
    tags: ["adjustments", "精算"],
    keywords: ["精算", "レジ締め", "現金", "過不足", "adjustment", "ドロア"],
    paramsSchema: {
      store_id: z.string().describe("店舗ID（必須）"),
      adjustment_date: z.string().optional().describe("精算日 YYYY-MM-DD"),
      adjustment_date_time: z.string().optional().describe("精算日時 ISO8601"),
      "adjustment_date_time-from": z.string().optional().describe("精算日時FROM 最大31日範囲"),
      "adjustment_date_time-to": z.string().optional().describe("精算日時TO 最大31日範囲"),
      terminal_id: z.string().optional().describe("端末ID"),
    },
  },

  "/budget/{store_id}": {
    method: "GET",
    description: "月別予算を取得します。予実管理に使用します。",
    tags: ["budget", "予算"],
    keywords: ["予算", "budget", "予実", "目標", "達成率"],
    paramsSchema: {
      "ym-from": z.string().optional().describe("予算年月FROM YYYYMM"),
      "ym-to": z.string().optional().describe("予算年月TO YYYYMM"),
      "upd_date_time-from": z.string().optional().describe("更新日時FROM 最大31日範囲"),
      "upd_date_time-to": z.string().optional().describe("更新日時TO 最大31日範囲"),
      limit: z.number().int().min(1).optional().describe("取得件数上限"),
      page: z.number().int().min(1).optional().describe("ページ番号"),
    },
  },
};
