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

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  KETUA_KK: "Ketua KK",
  KAPRODI: "Kaprodi",
};

type Dosen = { id: string; kode: string; nama: string };
type Kelas = {
  id: string;
  kodeKelas: string;
  dosenId: string | null;
  dosen: Dosen | null;
  assignedBy: { name: string; role: string } | null;
};
type CourseOffering = { id: string; semesterKe: number; tahunAngkatan: number; kelas: Kelas[] };
type MataKuliahRow = { id: string; kodeMK: string; nama: string; sks: number; courseOfferings: CourseOffering[] };
type Prodi = { id: string; kode: string; nama: string };

function semKeyLabel(semKey: string): string {
  const [ke, angkatan] = semKey.split("-");
  return `Sem ${ke} · Angkatan ${angkatan}`;
}

function parseSemKey(semKey: string) {
  const [a, b] = semKey.split("-");
  return { semesterKe: parseInt(a), tahunAngkatan: parseInt(b) };
}

export default function MataKuliahListClient({ prodiId, semKey }: { prodiId: string; semKey: string }) {
  const { semesterId } = useSemester();
  const [prodi, setProdi] = useState<Prodi | null>(null);
  const [mataKuliah, setMataKuliah] = useState<MataKuliahRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { semesterKe, tahunAngkatan } = parseSemKey(semKey);

  useEffect(() => {
    if (!semesterId) return;
    setLoading(true);
    setLoadError(null);
    fetch(`/api/plotting?prodiId=${prodiId}&semesterPeriodeId=${semesterId}&onlyOpened=true`)
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat data plotting");
        return res.json();
      })
      .then((data) => {
        setProdi(data.prodi);
        const filtered = (data.mataKuliah as MataKuliahRow[])
          .map((mk) => ({
            ...mk,
            courseOfferings: mk.courseOfferings.filter(
              (co) => co.semesterKe === semesterKe && co.tahunAngkatan === tahunAngkatan,
            ),
          }))
          .filter((mk) => mk.courseOfferings.length > 0)
          .sort((a, b) => a.kodeMK.localeCompare(b.kodeMK));
        setMataKuliah(filtered);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Gagal memuat data plotting"))
      .finally(() => setLoading(false));
  }, [prodiId, semKey, semesterId, semesterKe, tahunAngkatan]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <Link href="/plotting" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
          Plotting
        </Link>
        {prodi && (
          <>
            <span className="text-muted-foreground">/</span>
            <Link href={`/plotting/${prodiId}`} className="text-muted-foreground hover:text-foreground">
              {prodi.kode} — {prodi.nama}
            </Link>
          </>
        )}
        <span className="text-muted-foreground">/</span>
        <span className="font-medium text-foreground">{semKeyLabel(semKey)}</span>
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
              title="Tidak ada mata kuliah"
              description="Tidak ada mata kuliah yang dibuka untuk semester ini."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {mataKuliah.map((mk) => {
            const allKelas = mk.courseOfferings.flatMap((co) => co.kelas);
            const plottedCount = allKelas.filter((k) => k.dosenId).length;
            const total = allKelas.length;
            const badgeVariant =
              plottedCount === total ? "success" : plottedCount > 0 ? "warning" : "secondary";
            return (
              <Link
                key={mk.id}
                href={`/plotting/${prodiId}/${semKey}/${mk.id}`}
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
                    <Badge variant={badgeVariant}>
                      {plottedCount}/{total} Kelas Ditetapkan Pengampu
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
                      <span className="font-mono text-muted-foreground">{k.kodeKelas}</span>
                      {k.dosen ? (
                        <span className="text-foreground">
                          {k.dosen.kode} — {k.dosen.nama}
                          {k.assignedBy && (
                            <span className="text-muted-foreground">
                              {" · "}
                              {ROLE_LABELS[k.assignedBy.role] ?? k.assignedBy.role}{" "}
                              {k.assignedBy.name}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="italic text-muted-foreground">Belum Ditetapkan</span>
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
