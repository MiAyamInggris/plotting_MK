"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useSemester } from "@/components/SemesterContext";

type Dosen = { id: string; kode: string; nama: string };
type Kelas = {
  id: string;
  kodeKelas: string;
  sectionSuffix: string;
  sks: number;
  dosenId: string | null;
  dosen: Dosen | null;
  assignedBy: { name: string } | null;
};
type CourseOffering = { id: string; kelas: Kelas[] };
type MataKuliahRow = {
  id: string;
  kodeMK: string;
  nama: string;
  sks: number;
  courseOfferings: CourseOffering[];
};
type Prodi = { id: string; kode: string; nama: string };

export default function MataKuliahListClient({ prodiId }: { prodiId: string }) {
  const { semesterId } = useSemester();
  const [prodi, setProdi] = useState<Prodi | null>(null);
  const [mataKuliah, setMataKuliah] = useState<MataKuliahRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!semesterId) return;
    setLoading(true);
    setLoadError(null);
    fetch(`/api/plotting?prodiId=${prodiId}&semesterPeriodeId=${semesterId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load plotting data");
        return res.json();
      })
      .then((data) => {
        setProdi(data.prodi);
        setMataKuliah(data.mataKuliah);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load plotting data"))
      .finally(() => setLoading(false));
  }, [prodiId, semesterId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 text-sm">
        <Link href="/plotting" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
          Plotting
        </Link>
        {prodi && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium text-foreground">
              {prodi.kode} — {prodi.nama}
            </span>
          </>
        )}
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : mataKuliah.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={CalendarRange}
              title="No courses found"
              description="No courses found for this prodi in the active period."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {[...mataKuliah]
            .sort((a, b) => a.kodeMK.localeCompare(b.kodeMK))
            .map((mk) => {
              const allKelas = mk.courseOfferings.flatMap((co) => co.kelas);
              const plottedCount = allKelas.filter((k) => k.dosenId).length;
              return (
                <Link
                  key={mk.id}
                  href={`/plotting/${prodiId}/${mk.id}`}
                  className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {mk.kodeMK} — {mk.nama}{" "}
                        <span className="text-xs text-muted-foreground">({mk.sks} sks)</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={plottedCount === allKelas.length ? "default" : "secondary"}>
                        {plottedCount}/{allKelas.length} kelas plotted
                      </Badge>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {allKelas.map((k) => (
                      <span
                        key={k.id}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
                      >
                        <span className="font-mono text-muted-foreground">{k.sectionSuffix}</span>
                        {k.dosen ? (
                          <span className="text-foreground">
                            {k.dosen.kode} — {k.dosen.nama}
                            {k.assignedBy && (
                              <span className="text-muted-foreground"> · {k.assignedBy.name}</span>
                            )}
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground">Belum di-plotting</span>
                        )}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
        </div>
      )}
    </div>
  );
}
