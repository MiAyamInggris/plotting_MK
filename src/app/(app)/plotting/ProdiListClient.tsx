"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useSemester } from "@/components/SemesterContext";

type ProdiSummary = {
  prodiId: string;
  kode: string;
  nama: string;
  totalKelas: number;
  plottedKelas: number;
  unplottedKelas: number;
  unplottedSks: number;
};

export default function ProdiListClient() {
  const { semesterId } = useSemester();
  const [summary, setSummary] = useState<ProdiSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!semesterId) return;
    setLoading(true);
    setLoadError(null);
    fetch(`/api/plotting/summary?semesterPeriodeId=${semesterId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load plotting summary");
        return res.json();
      })
      .then((data) => setSummary(data.summary))
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load plotting summary"))
      .finally(() => setLoading(false));
  }, [semesterId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
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

  if (summary.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={Building2}
            title="No prodi have opened classes yet"
            description="No Program Studi has any opened classes in the active semester yet."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {summary.map((p) => (
        <Link
          key={p.prodiId}
          href={`/plotting/${p.prodiId}`}
          className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
        >
          <div>
            <p className="font-medium text-foreground">
              {p.kode} — {p.nama}
            </p>
            <p className="text-xs text-muted-foreground">
              {p.plottedKelas}/{p.totalKelas} kelas sudah ditetapkan pengampu
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={p.unplottedKelas > 0 ? "secondary" : "default"}>
              {p.unplottedKelas} kelas / {p.unplottedSks} SKS belum ditetapkan pengampu
            </Badge>
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
        </Link>
      ))}
    </div>
  );
}
