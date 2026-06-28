"use client";

import { Fragment, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
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

const ALL = "__all__";

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
  const [rows, setRows] = useState<Row[]>([]);
  const [sksCap, setSksCap] = useState(15);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pivotByDosen, setPivotByDosen] = useState<Record<string, Pivot>>({});
  const [pivotLoading, setPivotLoading] = useState<string | null>(null);

  async function load() {
    if (!semesterId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ semesterPeriodeId: semesterId });
      if (kkId !== ALL) params.set("kkId", kkId);
      if (homebaseProdiId !== ALL) params.set("homebaseProdiId", homebaseProdiId);
      const res = await fetch(`/api/recap/beban-dosen?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setRows(data.dosen);
      setSksCap(data.sksCap ?? 15);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kkId, homebaseProdiId, semesterId]);

  async function toggleExpand(row: Row) {
    if (expandedId === row.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(row.id);
    if (!pivotByDosen[row.id] && semesterId) {
      setPivotLoading(row.id);
      try {
        const res = await fetch(
          `/api/recap/pivot?kode=${encodeURIComponent(row.kode)}&semesterPeriodeId=${semesterId}`,
        );
        if (res.ok) {
          const data = await res.json();
          setPivotByDosen((prev) => ({ ...prev, [row.id]: data }));
        }
      } finally {
        setPivotLoading(null);
      }
    }
  }

  const chartData = rows.map((r) => ({
    kode: r.kode,
    teaching: r.totalSksPengajaran,
    struktural: r.bebanStrukturalSks ?? 0,
    overQuota: r.overQuota,
  }));

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">KK</Label>
            <Select value={kkId} onValueChange={setKkId}>
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
            <Select value={homebaseProdiId} onValueChange={setHomebaseProdiId}>
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

        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : rows.length === 0 ? (
          <EmptyState icon={Users} title="No dosen found" />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 34 + 40)}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 24, left: 8, bottom: 8 }}>
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
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.overQuota ? COLOR_TEACHING_OVER : COLOR_TEACHING_IN} />
                ))}
              </Bar>
              <Bar dataKey="struktural" stackId="beban" radius={[0, 4, 4, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.overQuota ? COLOR_STRUKTURAL_OVER : COLOR_STRUKTURAL_IN} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

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
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState icon={Users} title="No dosen found" />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <Fragment key={r.id}>
                  <TableRow className="h-12">
                    <TableCell className="font-medium">
                      <button
                        type="button"
                        className="flex items-center gap-1 hover:underline"
                        onClick={() => toggleExpand(r)}
                      >
                        {expandedId === r.id ? (
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
