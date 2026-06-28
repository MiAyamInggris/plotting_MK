"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import { EmptyState } from "@/components/EmptyState";
import { useSemester } from "@/components/SemesterContext";
import { JFA_GROUPS, type JfaGroup } from "@/lib/dosenRatios";

type ProdiRatio = {
  prodiId: string;
  prodiKode: string;
  prodiNama: string;
  totalDosen: number;
  dlbTetap: { dlb: number; tetap: number };
  pendidikan: { s2: number; s3: number; sedangS3: number };
  jfa: Record<JfaGroup, number>;
};

const ALL = "__all__";

const JFA_COLORS: Record<JfaGroup, string> = {
  AA: "#ED1E28",
  L: "#F2777B",
  LK: "#B6252A",
  GB: "#7A1216",
  NJFA: "#94A3B8",
};

function StackedRatioChart({
  title,
  data,
  keys,
  colors,
}: {
  title: string;
  data: Record<string, string | number>[];
  keys: string[];
  colors: string[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(160, data.length * 34 + 50)}>
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="prodiKode" width={64} tick={{ fontSize: 11 }} />
            <RechartsTooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {keys.map((key, i) => (
              <Bar
                key={key}
                dataKey={key}
                name={key}
                stackId="ratio"
                fill={colors[i]}
                radius={
                  i === 0
                    ? [4, 0, 0, 4]
                    : i === keys.length - 1
                      ? [0, 4, 4, 0]
                      : undefined
                }
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default function KetuaKkDashboard() {
  const { semesterId } = useSemester();
  const [prodiFilter, setProdiFilter] = useState(ALL);
  const [allProdiOptions, setAllProdiOptions] = useState<{ id: string; kode: string; nama: string }[]>([]);
  const [rows, setRows] = useState<ProdiRatio[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!semesterId) return;
    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams({ semesterPeriodeId: semesterId });
    if (prodiFilter !== ALL) params.set("prodiId", prodiFilter);
    fetch(`/api/dashboard/prodi-ratios?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard");
        return res.json();
      })
      .then((json) => {
        setRows(json.prodi);
        if (prodiFilter === ALL) {
          setAllProdiOptions(json.prodi.map((p: ProdiRatio) => ({ id: p.prodiId, kode: p.prodiKode, nama: p.prodiNama })));
        }
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, [semesterId, prodiFilter]);

  if (loading && rows.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    );
  }

  const dlbTetapData = rows.map((r) => ({
    prodiKode: r.prodiKode,
    Tetap: r.dlbTetap.tetap,
    DLB: r.dlbTetap.dlb,
  }));
  const pendidikanData = rows.map((r) => ({
    prodiKode: r.prodiKode,
    S2: r.pendidikan.s2,
    S3: r.pendidikan.s3,
    "Sedang S3": r.pendidikan.sedangS3,
  }));
  const jfaData = rows.map((r) => ({
    prodiKode: r.prodiKode,
    ...JFA_GROUPS.reduce((acc, g) => ({ ...acc, [g]: r.jfa[g] }), {} as Record<JfaGroup, number>),
  }));

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Prodi</Label>
        <Select value={prodiFilter} onValueChange={setProdiFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Prodi</SelectItem>
            {allProdiOptions.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.kode} — {p.nama}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Users} title="No prodi found" />
      ) : (
        <>
          <StackedRatioChart title="DLB vs Tetap" data={dlbTetapData} keys={["Tetap", "DLB"]} colors={["#64748B", "#ED1E28"]} />
          <StackedRatioChart
            title="Pendidikan (tetap only)"
            data={pendidikanData}
            keys={["S2", "S3", "Sedang S3"]}
            colors={["#64748B", "#B6252A", "#A0AAB8"]}
          />
          <StackedRatioChart
            title="JFA (tetap only)"
            data={jfaData}
            keys={[...JFA_GROUPS]}
            colors={JFA_GROUPS.map((g) => JFA_COLORS[g])}
          />
        </>
      )}
    </div>
  );
}
