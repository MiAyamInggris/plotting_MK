import { describe, it, expect } from "vitest";
import { sortByMetric, paginate, buildChartSlice, buildTableSlice } from "./bebanDosenRecap";

function makeRows(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `d${i + 1}`,
    totalBeban: (i + 1) * 2,
    jumlahKelas: n - i,
    jumlahMK: (i % 5) + 1,
  }));
}

describe("sortByMetric", () => {
  it("sorts descending by totalBeban", () => {
    const rows = makeRows(5);
    const sorted = sortByMetric(rows, "totalBeban");
    expect(sorted.map((r) => r.id)).toEqual(["d5", "d4", "d3", "d2", "d1"]);
  });

  it("sorts descending by jumlahKelas", () => {
    const rows = makeRows(5);
    const sorted = sortByMetric(rows, "jumlahKelas");
    expect(sorted.map((r) => r.id)).toEqual(["d1", "d2", "d3", "d4", "d5"]);
  });

  it("sorts descending by jumlahMK", () => {
    const rows = [
      { id: "a", totalBeban: 1, jumlahKelas: 1, jumlahMK: 3 },
      { id: "b", totalBeban: 1, jumlahKelas: 1, jumlahMK: 7 },
      { id: "c", totalBeban: 1, jumlahKelas: 1, jumlahMK: 1 },
    ];
    const sorted = sortByMetric(rows, "jumlahMK");
    expect(sorted.map((r) => r.id)).toEqual(["b", "a", "c"]);
  });

  it("does not mutate the input array", () => {
    const rows = makeRows(3);
    const original = [...rows];
    sortByMetric(rows, "totalBeban");
    expect(rows).toEqual(original);
  });
});

describe("paginate", () => {
  it("slices the correct page and reports total count/pages", () => {
    const rows = makeRows(45);
    const result = paginate(rows, 2, 20);
    expect(result.rows).toHaveLength(20);
    expect(result.rows[0].id).toBe("d21");
    expect(result.totalCount).toBe(45);
    expect(result.totalPages).toBe(3);
    expect(result.page).toBe(2);
  });

  it("returns the final partial page", () => {
    const rows = makeRows(45);
    const result = paginate(rows, 3, 20);
    expect(result.rows).toHaveLength(5);
  });

  it("clamps an out-of-range page down to the last page", () => {
    const rows = makeRows(15);
    const result = paginate(rows, 99, 10);
    expect(result.page).toBe(2);
    expect(result.rows).toHaveLength(5);
  });

  it("clamps a page below 1 up to 1", () => {
    const rows = makeRows(15);
    const result = paginate(rows, 0, 10);
    expect(result.page).toBe(1);
  });

  it("handles an empty input", () => {
    const result = paginate([], 1, 20);
    expect(result.rows).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.totalPages).toBe(1);
  });
});

describe("buildChartSlice", () => {
  it("top10 mode returns at most 10 rows, ranked by the chosen metric", () => {
    const rows = makeRows(50);
    const result = buildChartSlice(rows, { mode: "top10", metric: "totalBeban", page: 1 });
    expect(result.rows).toHaveLength(10);
    expect(result.rows.map((r) => r.id)).toEqual([
      "d50", "d49", "d48", "d47", "d46", "d45", "d44", "d43", "d42", "d41",
    ]);
    expect(result.totalCount).toBe(50);
  });

  it("top10 mode forces page to 1 regardless of the requested page", () => {
    const rows = makeRows(50);
    const result = buildChartSlice(rows, { mode: "top10", metric: "totalBeban", page: 4 });
    expect(result.page).toBe(1);
  });

  it("re-ranks when the metric changes", () => {
    const rows = makeRows(20);
    const byBeban = buildChartSlice(rows, { mode: "top10", metric: "totalBeban", page: 1 });
    const byKelas = buildChartSlice(rows, { mode: "top10", metric: "jumlahKelas", page: 1 });
    expect(byBeban.rows.map((r) => r.id)).not.toEqual(byKelas.rows.map((r) => r.id));
    expect(byKelas.rows.map((r) => r.id)).toEqual([
      "d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9", "d10",
    ]);
  });

  it("paged mode steps through 10 at a time past the top 10", () => {
    const rows = makeRows(25);
    const page2 = buildChartSlice(rows, { mode: "paged", metric: "totalBeban", page: 2 });
    expect(page2.rows).toHaveLength(10);
    expect(page2.rows[0].id).toBe("d15");
    expect(page2.totalPages).toBe(3);
  });
});

describe("buildTableSlice", () => {
  it("always ranks by totalBeban regardless of the chart's metric", () => {
    const rows = makeRows(30);
    const result = buildTableSlice(rows, { page: 1, pageSize: 20 });
    expect(result.rows).toHaveLength(20);
    expect(result.rows[0].id).toBe("d30");
    expect(result.totalCount).toBe(30);
    expect(result.totalPages).toBe(2);
  });

  it("supports a 50-row page size", () => {
    const rows = makeRows(120);
    const result = buildTableSlice(rows, { page: 1, pageSize: 50 });
    expect(result.rows).toHaveLength(50);
    expect(result.totalPages).toBe(3);
  });
});
