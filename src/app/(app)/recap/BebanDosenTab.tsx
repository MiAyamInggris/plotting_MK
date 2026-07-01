"use client";

import { Fragment, useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { PivotResult, type Pivot } from "@/components/PivotResult";
import { useSemester } from "@/components/SemesterContext";
import {
  CHART_METRICS,
  TABLE_PAGE_SIZES,
  type ChartMetric,
  type ChartMode,
  type TablePageSize,
} from "@/lib/bebanDosenRecap";

type ProgramStudi = { id: string; kode: string; nama: string };
type KelompokKeahlian = { id: string; nama: string };

type ByProdi = { prodiKode: string; prodiNama: string; kelas: number; sks: number };

type Row = {
  id: string;
  kode: string;
  nama: string;
  jfa: string | null;
  bebanStruktural: string | null;
  bebanStrukturalSks: number | null;
  kk: string | null;
  homebaseProdi: string | null;
  totalSksPengajaran: number;
  totalBeban: number;
  overQuota: boolean;
  jumlahKelas: number;
  jumlahMK: number;
  byProdi: ByProdi[];
};

type PageSlice<T> = { rows: T[]; page: number; pageSize: number; totalCount: number; totalPages: number };

const ALL = "__all__";

const METRIC_LABELS: Record<ChartMetric, string> = {
  totalBeban: "Beban SKS terberat",
  jumlahKelas: "Kelas terbanyak",
  jumlahMK: "Jenis MK terbanyak",
};

const LS_METRIC_KEY = "bebanDosen.chartMetric";
const LS_PAGE_SIZE_KEY = "bebanDosen.tablePageSize";

// Telkom red family for over-quota bars, neutral slate for within-quota --
// the struktural segment stays one shade lighter than teaching so the two
// are distinguishable within a stacked bar.
const COLOR_TEACHING_OVER = "#ED1E28";
const COLOR_STRUKTURAL_OVER = "#B6252A";
const COLOR_TEACHING_IN = "#64748B";
const COLOR_STRUKTURAL_IN = "#A0AAB8";

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey?: string; value?: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const teaching = payload.find((p) => p.dataKey === "teaching")?.value ?? 0;
  const struktural = payload.find((p) => p.dataKey === "struktural")?.value ?? 0;
  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground">Teaching: {teaching} sks</p>
      {struktural > 0 && <p className="text-muted-foreground">Struktural: {struktural} sks</p>}
      <p className="text-foreground">Total: {teaching + struktural} sks</p>
    </div>
  );
}

export default function BebanDosenTab({
  programStudi,
  kelompokKeahlian,
}: {
  programStudi: ProgramStudi[];
  kelompokKeahlian: KelompokKeahlian[];
}) {
  const { semesterId } = useSemester();
  const [kkId, setKkId] = useState(ALL);
  const [homebaseProdiId, setHomebaseProdiId] = useState(ALL);
  const [sksCap, setSksCap] = useState(15);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [chartMode, setChartMode] = useState<ChartMode>("top10");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("totalBeban");
  const [chartPage, setChartPage] = useState(1);
  const [chartData, setChartData] = useState<PageSlice<Row>>({
    rows: [],
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
  });

  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState<TablePageSize>(20);
  const [tableData, setTableData] = useState<PageSlice<Row>>({
    rows: [],
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 1,
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pivotByDosen, setPivotByDosen] = useState<Record<string, Pivot>>({});
  const [pivotLoading, setPivotLoading] = useState<string | null>(null);
  const [pivotErrors, setPivotErrors] = useState<Record<string, string>>({});

  // Restore persisted preferences once on mount -- localStorage isn't
  // available during SSR, so this can't run in a useState initializer.
  useEffect(() => {
    const savedMetric = localStorage.getItem(LS_METRIC_KEY);
    if (savedMetric && (CHART_METRICS as readonly string[]).includes(savedMetric)) {
      setChartMetric(savedMetric as ChartMetric);
    }
    const savedPageSize = Number(localStorage.getItem(LS_PAGE_SIZE_KEY));
    if ((TABLE_PAGE_SIZES as readonly number[]).includes(savedPageSize)) {
      setTablePageSize(savedPageSize as TablePageSize);
    }
  }, []);

  async function load() {
    if (!semesterId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({
        semesterPeriodeId: semesterId,
        chartMode,
        chartMetric,
        chartPage: String(chartPage),
        tablePage: String(tablePage),
        tablePageSize: String(tablePageSize),
      });
      if (kkId !== ALL) params.set("kkId", kkId);
      if (homebaseProdiId !== ALL) params.set("homebaseProdiId", homebaseProdiId);
      const res = await fetch(`/api/recap/beban-dosen?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setChartData(data.chart);
      setTableData(data.table);
      setSksCap(data.sksCap ?? 15);
      // Sync local page state from the server's (possibly clamped) page so
      // the UI never drifts from what was actually returned.
      setChartPage(data.chart.page);
      setTablePage(data.table.page);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kkId, homebaseProdiId, semesterId, chartMode, chartMetric, chartPage, tablePage, tablePageSize]);

  function onFilterChange(setter: (v: string) => void) {
    return (v: string) => {
      setter(v);
      setChartPage(1);
      setTablePage(1);
    };
  }

  function onMetricChange(metric: ChartMetric) {
    setChartMetric(metric);
    setChartPage(1);
    localStorage.setItem(LS_METRIC_KEY, metric);
  }

  function onModeChange(mode: ChartMode) {
    setChartMode(mode);
    setChartPage(1);
  }

  function onPageSizeChange(size: TablePageSize) {
    setTablePageSize(size);
    setTablePage(1);
    localStorage.setItem(LS_PAGE_SIZE_KEY, String(size));
  }

  async function fetchPivot(row: Row) {
    if (!semesterId) return;
    setPivotLoading(row.id);
    setPivotErrors((prev) => { const n = { ...prev }; delete n[row.id]; return n; });
    try {
      const res = await fetch(
        `/api/recap/pivot?kode=${encodeURIComponent(row.kode)}&semesterPeriodeId=${semesterId}`,
      );
      if (!res.ok) throw new Error("Failed to load detail");
      const data = await res.json();
      setPivotByDosen((prev) => ({ ...prev, [row.id]: data }));
    } catch (e) {
      setPivotErrors((prev) => ({
        ...prev,
        [row.id]: e instanceof Error ? e.message : "Failed to load",
      }));
    } finally {
      setPivotLoading(null);
    }
  }

  function toggleExpand(row: Row) {
    if (expandedId === row.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(row.id);
    if (!pivotByDosen[row.id]) {
      void fetchPivot(row);
    }
  }

  const chartRows = chartData.rows.map((r) => ({
    kode: r.kode,
    teaching: r.totalSksPengajaran,
    struktural: r.bebanStrukturalSks ?? 0,
    overQuota: r.overQuota,
  }));

  const tableRangeStart = (tableData.page - 1) * tableData.pageSize + 1;
  const tableRangeEnd = Math.min(tableData.page * tableData.pageSize, tableData.totalCount);

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">KK</Label>
            <Select value={kkId} onValueChange={onFilterChange(setKkId)} disabled={loading}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {kelompokKeahlian.map((k) => (
                  <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Homebase Prodi</Label>
            <Select value={homebaseProdiId} onValueChange={onFilterChange(setHomebaseProdiId)} disabled={loading}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {programStudi.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.kode}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Ranking</Label>
            <Select value={chartMetric} onValueChange={(v) => onMetricChange(v as ChartMetric)}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHART_METRICS.map((m) => (
                  <SelectItem key={m} value={m}>{METRIC_LABELS[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border border-border p-0.5">
              <Button
                type="button"
                size="sm"
                variant={chartMode === "top10" ? "default" : "ghost"}
                className="h-7"
                onClick={() => onModeChange("top10")}
              >
                Top 10
              </Button>
              <Button
                type="button"
                size="sm"
                variant={chartMode === "paged" ? "default" : "ghost"}
                className="h-7"
                onClick={() => onModeChange("paged")}
              >
                Paginated
              </Button>
            </div>
            {chartMode === "paged" && (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-7"
                  disabled={chartData.page <= 1}
                  onClick={() => setChartPage((p) => p - 1)}
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {chartData.page} of {chartData.totalPages}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-7"
                  disabled={chartData.page >= chartData.totalPages}
                  onClick={() => setChartPage((p) => p + 1)}
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : chartRows.length === 0 ? (
          <EmptyState icon={Users} title="No dosen found" />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, chartRows.length * 34 + 40)}>
            <BarChart data={chartRows} layout="vertical" margin={{ top: 20, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="kode" width={72} tick={{ fontSize: 11 }} />
              <RechartsTooltip content={<ChartTooltip />} />
              <ReferenceLine
                x={sksCap}
                stroke="#ED1E28"
                strokeDasharray="4 4"
                label={{ value: `Quota ${sksCap}`, position: "top", fontSize: 11, fill: "#ED1E28" }}
              />
              <Bar dataKey="teaching" stackId="beban" radius={[4, 0, 0, 4]}>
                {chartRows.map((d, i) => (
                  <Cell key={i} fill={d.overQuota ? COLOR_TEACHING_OVER : COLOR_TEACHING_IN} />
                ))}
              </Bar>
              <Bar dataKey="struktural" stackId="beban" radius={[0, 4, 4, 0]}>
                {chartRows.map((d, i) => (
                  <Cell key={i} fill={d.overQuota ? COLOR_STRUKTURAL_OVER : COLOR_STRUKTURAL_IN} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-xs text-muted-foreground">
            {tableData.totalCount === 0
              ? "0 dosen"
              : `${tableRangeStart}–${tableRangeEnd} of ${tableData.totalCount}`}
          </Label>
          <div className="flex items-center gap-2">
            <Select value={String(tablePageSize)} onValueChange={(v) => onPageSizeChange(Number(v) as TablePageSize)}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TABLE_PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>{s} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-8"
              disabled={tableData.page <= 1}
              onClick={() => setTablePage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-8"
              disabled={tableData.page >= tableData.totalPages}
              onClick={() => setTablePage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky top-0 bg-card">Kode</TableHead>
              <TableHead className="sticky top-0 bg-card">Nama</TableHead>
              <TableHead className="sticky top-0 bg-card">JFA</TableHead>
              <TableHead className="sticky top-0 bg-card">KK</TableHead>
              <TableHead className="sticky top-0 bg-card">Homebase</TableHead>
              <TableHead className="sticky top-0 bg-card">Breakdown by Prodi</TableHead>
              <TableHead className="sticky top-0 bg-card text-right">Total Beban (SKS)</TableHead>
              <TableHead className="sticky top-0 bg-card text-right">Kelas</TableHead>
              <TableHead className="sticky top-0 bg-card text-right">MK</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton columns={9} />
            ) : tableData.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState icon={Users} title="No dosen found" />
                </TableCell>
              </TableRow>
            ) : (
              tableData.rows.map((r) => (
                <Fragment key={r.id}>
                  <TableRow className="h-12">
                    <TableCell className="font-medium">
                      <button
                        type="button"
                        className="flex items-center gap-1 hover:underline disabled:cursor-not-allowed disabled:opacity-70"
                        onClick={() => toggleExpand(r)}
                        disabled={pivotLoading === r.id}
                      >
                        {pivotLoading === r.id ? (
                          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                        ) : expandedId === r.id ? (
                          <ChevronDown className="size-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-3.5 text-muted-foreground" />
                        )}
                        {r.kode}
                      </button>
                    </TableCell>
                    <TableCell>{r.nama}</TableCell>
                    <TableCell>{r.jfa ?? "—"}</TableCell>
                    <TableCell>{r.kk ?? "—"}</TableCell>
                    <TableCell>{r.homebaseProdi ?? "—"}</TableCell>
                    <TableCell>
                      {r.byProdi.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {r.byProdi.map((p) => (
                            <Badge key={p.prodiKode} variant="outline" className="text-[10px] font-normal">
                              {p.prodiKode} ({p.kelas} kelas, {p.sks} sks)
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.overQuota && (
                          <Badge variant="destructive" className="text-[10px]">
                            Over quota
                          </Badge>
                        )}
                        <span className={r.overQuota ? "font-semibold text-destructive" : "font-medium"}>
                          {r.totalBeban}
                        </span>
                      </div>
                      {r.bebanStrukturalSks ? (
                        <p className="text-xs text-muted-foreground">
                          ajar {r.totalSksPengajaran} + struktural {r.bebanStrukturalSks}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">{r.jumlahKelas}</TableCell>
                    <TableCell className="text-right">{r.jumlahMK}</TableCell>
                  </TableRow>
                  {expandedId === r.id && (
                    <TableRow>
                      <TableCell colSpan={9} className="bg-muted/20">
                        {pivotLoading === r.id ? (
                          <Skeleton className="h-24 w-full" />
                        ) : pivotErrors[r.id] ? (
                          <div className="flex items-center gap-3 py-2">
                            <p className="text-sm text-destructive">{pivotErrors[r.id]}</p>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void fetchPivot(r)}
                            >
                              Retry
                            </Button>
                          </div>
                        ) : pivotByDosen[r.id] ? (
                          <PivotResult pivot={pivotByDosen[r.id]} />
                        ) : (
                          <p className="text-sm text-muted-foreground">No load this semester.</p>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
