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

type Kelas = { id: string; dosenId: string | null };
type CourseOffering = { id: string; semesterKe: number; tahunAngkatan: number; kelas: Kelas[] };
type MataKuliahRow = { id: string; courseOfferings: CourseOffering[] };
type Prodi = { id: string; kode: string; nama: string };

type SemesterGroup = {
  semKey: string;
  semesterKe: number;
  tahunAngkatan: number;
  totalKelas: number;
  plottedKelas: number;
  totalMK: number;
};

export default function SemesterListClient({ prodiId }: { prodiId: string }) {
  const { semesterId } = useSemester();
  const [prodi, setProdi] = useState<Prodi | null>(null);
  const [groups, setGroups] = useState<SemesterGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
        const map = new Map<string, SemesterGroup>();
        for (const mk of data.mataKuliah as MataKuliahRow[]) {
          for (const co of mk.courseOfferings) {
            const semKey = `${co.semesterKe}-${co.tahunAngkatan}`;
            if (!map.has(semKey)) {
              map.set(semKey, {
                semKey,
                semesterKe: co.semesterKe,
                tahunAngkatan: co.tahunAngkatan,
                totalKelas: 0,
                plottedKelas: 0,
                totalMK: 0,
              });
            }
            const g = map.get(semKey)!;
            g.totalKelas += co.kelas.length;
            g.plottedKelas += co.kelas.filter((k) => k.dosenId).length;
            g.totalMK += 1;
          }
        }
        setGroups(
          [...map.values()].sort(
            (a, b) => b.tahunAngkatan - a.tahunAngkatan || a.semesterKe - b.semesterKe,
          ),
        );
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Gagal memuat data plotting"))
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
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={CalendarRange}
              title="Belum ada kelas yang dibuka"
              description="Belum ada kelas yang dibuka untuk prodi ini pada semester aktif."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => {
            const variant =
              g.plottedKelas === g.totalKelas
                ? "success"
                : g.plottedKelas > 0
                  ? "warning"
                  : "secondary";
            return (
              <Link
                key={g.semKey}
                href={`/plotting/${prodiId}/${g.semKey}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium text-foreground">
                    Semester {g.semesterKe} · Angkatan {g.tahunAngkatan}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {g.totalMK} mata kuliah · {g.totalKelas} kelas
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={variant}>
                    {g.plottedKelas}/{g.totalKelas} Kelas Ditetapkan Pengampu
                  </Badge>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
