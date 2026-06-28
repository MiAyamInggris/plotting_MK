"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type Slice = { name: string; value: number; fill: string };

const JFA_COLORS: Record<JfaGroup, string> = {
  AA: "#ED1E28",
  L: "#F2777B",
  LK: "#B6252A",
  GB: "#7A1216",
  NJFA: "#94A3B8",
};

function DonutCard({ title, data, caption }: { title: string; data: Slice[]; caption?: string }) {
  const nonZero = data.filter((d) => d.value > 0);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {caption && <p className="text-xs text-muted-foreground">{caption}</p>}
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={nonZero} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                {nonZero.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default function KaprodiDashboard() {
  const { semesterId } = useSemester();
  const [data, setData] = useState<ProdiRatio | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!semesterId) return;
    setLoading(true);
    setLoadError(null);
    fetch(`/api/dashboard/prodi-ratios?semesterPeriodeId=${semesterId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard");
        return res.json();
      })
      .then((json) => setData(json.prodi[0] ?? null))
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, [semesterId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
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

  if (!data) {
    return <EmptyState icon={Users} title="No prodi bound to your account" />;
  }

  if (data.totalDosen === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium text-foreground">
          {data.prodiKode} — {data.prodiNama}
        </p>
        <EmptyState
          icon={Users}
          title="No dosen plotted yet"
          description="No dosen have been assigned to a class in this prodi this semester."
        />
      </div>
    );
  }

  const dlbTetapData: Slice[] = [
    { name: "Tetap", value: data.dlbTetap.tetap, fill: "#64748B" },
    { name: "DLB", value: data.dlbTetap.dlb, fill: "#ED1E28" },
  ];
  const pendidikanData: Slice[] = [
    { name: "S2", value: data.pendidikan.s2, fill: "#64748B" },
    { name: "S3", value: data.pendidikan.s3, fill: "#B6252A" },
    { name: "Sedang S3", value: data.pendidikan.sedangS3, fill: "#A0AAB8" },
  ];
  const jfaData: Slice[] = JFA_GROUPS.map((g) => ({ name: g, value: data.jfa[g], fill: JFA_COLORS[g] }));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">
          {data.prodiKode} — {data.prodiNama}
        </p>
        <p className="text-xs text-muted-foreground">{data.totalDosen} dosen plotted this semester</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <DonutCard title="DLB vs Tetap" data={dlbTetapData} />
        <DonutCard title="Pendidikan" data={pendidikanData} caption="Tetap only" />
        <DonutCard title="JFA" data={jfaData} caption="Tetap only" />
      </div>
    </div>
  );
}
