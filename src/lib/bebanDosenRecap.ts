export type BebanDosenRow = {
  id: string;
  totalBeban: number;
  jumlahKelas: number;
  jumlahMK: number;
  [key: string]: unknown;
};

export const CHART_METRICS = ["totalBeban", "jumlahKelas", "jumlahMK"] as const;
export type ChartMetric = (typeof CHART_METRICS)[number];

export const CHART_MODES = ["top10", "paged"] as const;
export type ChartMode = (typeof CHART_MODES)[number];

export const CHART_PAGE_SIZE = 10;

export const TABLE_PAGE_SIZES = [20, 50] as const;
export type TablePageSize = (typeof TABLE_PAGE_SIZES)[number];

export type PageSlice<T> = {
  rows: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export function sortByMetric<T extends Record<string, unknown>>(rows: T[], metric: string): T[] {
  return [...rows].sort((a, b) => (b[metric] as number) - (a[metric] as number));
}

export function paginate<T>(rows: T[], page: number, pageSize: number): PageSlice<T> {
  const totalCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    totalCount,
    totalPages,
  };
}

export function buildChartSlice<T extends Record<string, unknown>>(
  rows: T[],
  { mode, metric, page }: { mode: ChartMode; metric: ChartMetric; page: number },
): PageSlice<T> & { mode: ChartMode; metric: ChartMetric } {
  const sorted = sortByMetric(rows, metric);
  if (mode === "top10") {
    const totalCount = sorted.length;
    return {
      rows: sorted.slice(0, CHART_PAGE_SIZE),
      page: 1,
      pageSize: CHART_PAGE_SIZE,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / CHART_PAGE_SIZE)),
      mode,
      metric,
    };
  }
  return { ...paginate(sorted, page, CHART_PAGE_SIZE), mode, metric };
}

export function buildTableSlice<T extends Record<string, unknown>>(
  rows: T[],
  { page, pageSize }: { page: number; pageSize: number },
): PageSlice<T> {
  // The detail table always ranks by heaviest total beban first (R12's
  // default), independent of whichever metric the chart is currently using.
  const sorted = sortByMetric(rows, "totalBeban");
  return paginate(sorted, page, pageSize);
}
