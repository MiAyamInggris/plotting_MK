"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useSemester } from "@/components/SemesterContext";
import type { HeatmapCell, HeatmapRow } from "@/app/api/dashboard/plotting-heatmap/route";

type Metric = "unplotted" | "pctComplete" | "totalSks";

const METRIC_LABELS: Record<Metric, string> = {
  unplotted: "Kelas Belum Ditetapkan Pengampu",
  pctComplete: "Persentase Plotting Selesai",
  totalSks: "Total Beban SKS",
};

const LEGEND_LESS = "Sedikit";
const LEGEND_MORE = "Banyak";

const LS_KEY = "heatmap.metric";

// 5-step color scales per metric.
function getCellColor(cell: HeatmapCell, metric: Metric): string {
  if (cell.jumlahKelas === 0) return "#F3F4F6"; // empty — gray-100

  if (metric === "unplotted") {
    const pct = cell.jumlahKelas > 0 ? (cell.unassignedKelas / cell.jumlahKelas) * 100 : 0;
    if (pct === 0) return "#16A34A"; // all plotted — success green
    if (pct <= 25) return "#FEF3C7"; // few unplotted — amber-100
    if (pct <= 50) return "#FCD34D"; // some unplotted — amber-300
    if (pct <= 75) return "#F59E0B"; // many unplotted — amber-500
    return "#DC2626"; // most/all unplotted — danger red
  }

  if (metric === "pctComplete") {
    const pct = cell.pctComplete;
    if (pct === 0) return "#FEE2E2"; // 0% — lightest concern
    if (pct < 25) return "#BBF7D0"; // very light green
    if (pct < 50) return "#86EFAC"; // light green
    if (pct < 75) return "#4ADE80"; // medium green
    if (pct < 100) return "#16A34A"; // strong green
    return "#14532D"; // dark green — fully complete
  }

  // totalSks — blue scale
  const sks = cell.totalSks;
  if (sks === 0) return "#E5E7EB";
  if (sks <= 10) return "#BFDBFE"; // blue-200
  if (sks <= 30) return "#93C5FD"; // blue-300
  if (sks <= 60) return "#3B82F6"; // blue-500
  return "#1D4ED8"; // blue-700
}

function getLegendSteps(metric: Metric): { color: string; label?: string }[] {
  if (metric === "unplotted") {
    return [
      { color: "#16A34A", label: "0%" },
      { color: "#FEF3C7" },
      { color: "#FCD34D" },
      { color: "#F59E0B" },
      { color: "#DC2626", label: "100%" },
    ];
  }
  if (metric === "pctComplete") {
    return [
      { color: "#FEE2E2", label: "0%" },
      { color: "#BBF7D0" },
      { color: "#4ADE80" },
      { color: "#16A34A" },
      { color: "#14532D", label: "100%" },
    ];
  }
  return [
    { color: "#E5E7EB", label: "0 SKS" },
    { color: "#BFDBFE" },
    { color: "#93C5FD" },
    { color: "#3B82F6" },
    { color: "#1D4ED8" },
  ];
}

function cellMetricValue(cell: HeatmapCell, metric: Metric): string {
  if (metric === "unplotted") return `${cell.unassignedKelas} belum`;
  if (metric === "pctComplete") return `${cell.pctComplete}%`;
  return `${cell.totalSks} sks`;
}

type DrilldownTarget = { row: HeatmapRow; cell: HeatmapCell } | null;

export default function ProdiHeatmap() {
  const { semesterId } = useSemester();
  const [metric, setMetric] = useState<Metric>("unplotted");
  const [rows, setRows] = useState<HeatmapRow[]>([]);
  const [semesters, setSemesters] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drilldown, setDrilldown] = useState<DrilldownTarget>(null);

  // Restore persisted metric on mount (SSR-safe).
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved && (saved === "unplotted" || saved === "pctComplete" || saved === "totalSks")) {
      setMetric(saved as Metric);
    }
  }, []);

  useEffect(() => {
    if (!semesterId) return;
    setLoading(true);
    setLoadError(null);
    fetch(`/api/dashboard/plotting-heatmap?semesterPeriodeId=${semesterId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat data heatmap");
        return res.json();
      })
      .then((json) => {
        setRows(json.rows as HeatmapRow[]);
        setSemesters(json.semesters as number[]);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Gagal memuat data heatmap"))
      .finally(() => setLoading(false));
  }, [semesterId]);

  function onMetricChange(m: Metric) {
    setMetric(m);
    localStorage.setItem(LS_KEY, m);
  }

  const legendSteps = getLegendSteps(metric);

  return (
    <TooltipProvider delayDuration={100}>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Peta Status Plotting per Prodi dan Semester</CardTitle>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Metrik</Label>
            <Select value={metric} onValueChange={(v) => onMetricChange(v as Metric)}>
              <SelectTrigger className="w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => (
                  <SelectItem key={m} value={m}>{METRIC_LABELS[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : loadError ? (
            <Alert variant="destructive">
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada kelas yang dibuka pada semester ini.
            </p>
          ) : (
            <div className="space-y-4 overflow-x-auto">
              {/* Grid */}
              <div
                className="grid gap-1"
                style={{ gridTemplateColumns: `minmax(80px, auto) repeat(${semesters.length}, 2rem)` }}
              >
                {/* Column headers — semester numbers */}
                <div />
                {semesters.map((s) => (
                  <div key={s} className="flex items-center justify-center">
                    <span className="text-[10px] font-medium text-muted-foreground">S{s}</span>
                  </div>
                ))}

                {/* Rows — one per prodi */}
                {rows.map((row) => (
                  <>
                    {/* Prodi label */}
                    <div key={`label-${row.prodiId}`} className="flex items-center pr-1">
                      <span className="text-xs font-medium text-foreground truncate" title={`${row.prodiKode} — ${row.prodiNama}`}>
                        {row.prodiKode}
                      </span>
                    </div>

                    {/* Cells */}
                    {row.cells.map((cell) => (
                      <Tooltip key={`${row.prodiId}-${cell.semesterKe}`}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label={`${row.prodiKode} Semester ${cell.semesterKe}: ${cellMetricValue(cell, metric)}`}
                            className="size-8 rounded-sm transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            style={{ backgroundColor: getCellColor(cell, metric) }}
                            onClick={() => cell.jumlahKelas > 0 && setDrilldown({ row, cell })}
                          >
                            {cell.jumlahKelas > 0 && (
                              <span className="sr-only">{cellMetricValue(cell, metric)}</span>
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p className="font-medium">{row.prodiKode} — Semester {cell.semesterKe}</p>
                          {cell.jumlahKelas === 0 ? (
                            <p className="text-muted-foreground">Tidak ada kelas</p>
                          ) : (
                            <>
                              <p>{cell.jumlahKelas} kelas · {cell.totalSks} SKS</p>
                              <p>
                                {cell.unassignedKelas === 0
                                  ? "Semua kelas telah ditetapkan"
                                  : `${cell.unassignedKelas} belum ditetapkan pengampu`}
                              </p>
                              <p>{cell.pctComplete}% selesai</p>
                            </>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">{LEGEND_LESS}</span>
                {legendSteps.map((step, i) => (
                  <div
                    key={i}
                    className="size-3.5 rounded-[2px]"
                    style={{ backgroundColor: step.color }}
                    title={step.label}
                  />
                ))}
                <span className="text-[10px] text-muted-foreground">{LEGEND_MORE}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drilldown dialog */}
      <Dialog open={drilldown !== null} onOpenChange={(open) => !open && setDrilldown(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {drilldown?.row.prodiKode} — Semester {drilldown?.cell.semesterKe}
            </DialogTitle>
          </DialogHeader>
          {drilldown && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">{drilldown.cell.jumlahKelas} kelas · {drilldown.cell.totalSks} SKS</span>
                {drilldown.cell.unassignedKelas > 0 ? (
                  <Badge variant="warning">
                    {drilldown.cell.unassignedKelas} belum ditetapkan pengampu
                  </Badge>
                ) : (
                  <Badge variant="success">Semua kelas telah ditetapkan</Badge>
                )}
              </div>
              <div className="divide-y divide-border rounded-md border border-border">
                {drilldown.cell.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-3 py-2 text-xs">
                    <div>
                      <span className="font-mono font-medium text-foreground">{item.kodeKelas}</span>
                      <span className="ml-2 text-muted-foreground">{item.kodeMK} · {item.namaMK} · {item.sks} sks</span>
                    </div>
                    {item.dosen ? (
                      <span className="text-foreground">{item.dosen.kode} — {item.dosen.nama}</span>
                    ) : (
                      <span className="italic text-muted-foreground">Belum ditetapkan</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
