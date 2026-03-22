/**
 * 31日上限のAPI期間制限を自動的に分割して順次取得する。
 * 長期間のデータ取得をAI側に意識させず、MCP側で透過的に処理する。
 */

import { filterCancelledTransactions, SUM_FIELDS_SET } from "./aggregation.js";

export interface SplitChunk {
  from: string;
  to: string;
}

export interface SplitResult {
  data: Record<string, unknown>[];
  apiCalls: number;
  coveredPeriod: { from: string; to: string };
  coveredMonths: string[];
  monthlyBreakdown: Record<string, { count: number } & Record<string, number>>;
  failedChunks: SplitChunk[];
}

const MAX_DAYS = 31;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** ISO日付文字列からDateを生成（タイムゾーン情報は保持） */
function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

/** 2つの日付の日数差を計算 */
function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/** DateをISO8601 +09:00 形式に変換 */
function toJstIso(date: Date, isEnd: boolean = false): string {
  // JSTでの年月日を取得
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  const time = isEnd ? "23:59:59" : "00:00:00";
  return `${y}-${m}-${d}T${time}+09:00`;
}

/** from〜to が31日を超えるか判定 */
export function needsSplitting(from: string, to: string): boolean {
  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  return daysBetween(fromDate, toDate) > MAX_DAYS;
}

/** from〜to を31日チャンクに分割 */
export function splitPeriod(from: string, to: string): SplitChunk[] {
  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  const chunks: SplitChunk[] = [];

  let current = fromDate;
  while (current < toDate) {
    const chunkEnd = new Date(current.getTime() + (MAX_DAYS - 1) * MS_PER_DAY);
    const actualEnd = chunkEnd > toDate ? toDate : chunkEnd;

    chunks.push({
      from: toJstIso(current, false),
      to: toJstIso(actualEnd, true),
    });

    current = new Date(actualEnd.getTime() + MS_PER_DAY);
  }

  return chunks;
}

/** from〜to 間のYYYY-MM一覧を生成 */
export function computeCoveredMonths(from: string, to: string): string[] {
  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  const months: string[] = [];

  // JSTで計算
  const fromJst = new Date(fromDate.getTime() + 9 * 60 * 60 * 1000);
  const toJst = new Date(toDate.getTime() + 9 * 60 * 60 * 1000);

  let y = fromJst.getUTCFullYear();
  let m = fromJst.getUTCMonth();

  const endY = toJst.getUTCFullYear();
  const endM = toJst.getUTCMonth();

  while (y < endY || (y === endY && m <= endM)) {
    months.push(`${y}-${String(m + 1).padStart(2, "0")}`);
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }

  return months;
}

/** レコードからYYYY-MMを抽出 */
function extractMonth(record: Record<string, unknown>): string | null {
  const dt = record.transactionDateTime ?? record.transactionHeadDateTime;
  if (typeof dt !== "string") return null;
  const match = dt.match(/^(\d{4}-\d{2})/);
  return match ? match[1] : null;
}

/** 月別内訳を計算（取消済み除外済みのデータで） */
function computeMonthlyBreakdown(
  data: Record<string, unknown>[],
): Record<string, { count: number } & Record<string, number>> {
  const { filtered } = filterCancelledTransactions(data);
  const breakdown: Record<string, { count: number } & Record<string, number>> = {};

  // 集計対象フィールドを検出
  const fieldsFound = new Set<string>();
  const first = filtered[0];
  if (first) {
    for (const key of Object.keys(first)) {
      if (SUM_FIELDS_SET.has(key)) {
        const val = first[key];
        if ((typeof val === "string" || typeof val === "number") && !isNaN(Number(val))) {
          fieldsFound.add(key);
        }
      }
    }
  }

  for (const record of filtered) {
    const month = extractMonth(record) ?? "unknown";
    if (!breakdown[month]) {
      breakdown[month] = { count: 0 } as { count: number } & Record<string, number>;
    }
    breakdown[month].count++;
    for (const field of fieldsFound) {
      const val = record[field];
      if (val != null) {
        const num = Number(val);
        if (!isNaN(num)) {
          breakdown[month][field] = (breakdown[month][field] ?? 0) + num;
        }
      }
    }
  }

  // 丸め
  for (const monthData of Object.values(breakdown)) {
    for (const key of Object.keys(monthData)) {
      if (key === "count") continue;
      const val = monthData[key];
      if (typeof val === "number" && !Number.isInteger(val)) {
        monthData[key] = Math.round(val * 100) / 100;
      }
    }
  }

  return breakdown;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 期間を分割してAPIを順次呼び出し、結果をマージする */
export async function fetchWithPeriodSplitting(
  path: string,
  baseParams: Record<string, unknown>,
  requestFn: (path: string, options?: RequestInit) => Promise<unknown>,
  options?: { delayMs?: number },
): Promise<SplitResult> {
  const from = baseParams["transaction_date_time-from"] as string;
  const to = baseParams["transaction_date_time-to"] as string;
  const delayMs = options?.delayMs ?? 200;

  const chunks = splitPeriod(from, to);
  const allData: Record<string, unknown>[] = [];
  const failedChunks: SplitChunk[] = [];
  let apiCalls = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // レート制限対応: 2回目以降にディレイ
    if (i > 0) {
      await sleep(delayMs);
    }

    try {
      const chunkParams = { ...baseParams };
      chunkParams["transaction_date_time-from"] = chunk.from;
      chunkParams["transaction_date_time-to"] = chunk.to;

      const qs = new URLSearchParams(
        Object.entries(chunkParams)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ).toString();

      const data = await requestFn(`${path}?${qs}`, { method: "GET" });
      apiCalls++;

      if (Array.isArray(data)) {
        allData.push(...(data as Record<string, unknown>[]));
      }
    } catch {
      failedChunks.push(chunk);
      apiCalls++;
    }
  }

  const coveredMonths = computeCoveredMonths(from, to);
  const monthlyBreakdown = computeMonthlyBreakdown(allData);

  return {
    data: allData,
    apiCalls,
    coveredPeriod: { from, to },
    coveredMonths,
    monthlyBreakdown,
    failedChunks,
  };
}
