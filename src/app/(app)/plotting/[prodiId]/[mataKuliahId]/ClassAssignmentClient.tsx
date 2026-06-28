"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useSemester } from "@/components/SemesterContext";
import DosenPicker, { type AssignContext, type DosenOption } from "../../DosenPicker";

type Dosen = { id: string; kode: string; nama: string; kkId: string | null; aktif: boolean };
type Kelas = {
  id: string;
  kodeKelas: string;
  sks: number;
  dosenId: string | null;
  dosen: Dosen | null;
  assignedBy: { name: string } | null;
};
type CourseOffering = {
  id: string;
  semesterKe: number;
  tahunAngkatan: number;
  kelas: Kelas[];
};
type MataKuliahRow = {
  id: string;
  kodeMK: string;
  nama: string;
  sks: number;
  ket: string | null;
  courseOfferings: CourseOffering[];
};
type Prodi = { id: string; kode: string; nama: string };
type RuleWarning = { level: "error" | "warning"; code: string; message: string };

function SectionChip({
  kelas,
  semesterKe,
  tahunAngkatan,
  canEdit,
  dosenOptions,
  context,
  semesterId,
  canRegisterDlb,
  onAssign,
  onClear,
  onDlbRegistered,
  saving,
}: {
  kelas: Kelas;
  semesterKe: number;
  tahunAngkatan: number;
  canEdit: boolean;
  dosenOptions: DosenOption[];
  context: AssignContext;
  semesterId: string;
  canRegisterDlb: boolean;
  onAssign: (dosenId: string) => void;
  onClear: () => void;
  onDlbRegistered: (dosen: DosenOption) => void;
  saving: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs">
      <span className="text-muted-foreground">
        Sem {semesterKe} · Angkatan {tahunAngkatan}
      </span>
      <span className="font-mono font-medium">{kelas.kodeKelas}</span>
      <span className={kelas.dosen ? "text-foreground" : "text-muted-foreground italic"}>
        {kelas.dosen ? `${kelas.dosen.kode} — ${kelas.dosen.nama}` : "unassigned"}
      </span>
      <span className="text-muted-foreground">({kelas.sks} sks)</span>
      <Badge variant={kelas.dosen ? "default" : "secondary"} className="text-[10px]">
        {kelas.dosen
          ? `Sudah di-plotting${kelas.assignedBy ? ` · ${kelas.assignedBy.name}` : ""}`
          : "Belum di-plotting"}
      </Badge>

      {canEdit && (
        <>
          <DosenPicker
            options={dosenOptions}
            context={context}
            semesterId={semesterId}
            canRegisterDlb={canRegisterDlb}
            onSelect={onAssign}
            onDlbRegistered={onDlbRegistered}
            trigger={
              <Button variant="outline" size="sm" className="h-6 px-1.5 text-xs" disabled={saving}>
                {saving ? "…" : "Change"}
              </Button>
            }
          />
          {kelas.dosen && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-1.5 text-xs"
              disabled={saving}
              onClick={onClear}
            >
              Clear
            </Button>
          )}
        </>
      )}
    </div>
  );
}

export default function ClassAssignmentClient({
  prodiId,
  mataKuliahId,
  canEdit,
  canRegisterDlb,
}: {
  prodiId: string;
  mataKuliahId: string;
  canEdit: boolean;
  canRegisterDlb: boolean;
}) {
  const { semesterId } = useSemester();
  const [prodi, setProdi] = useState<Prodi | null>(null);
  const [mk, setMk] = useState<MataKuliahRow | null>(null);
  const [dosenOptions, setDosenOptions] = useState<DosenOption[]>([]);
  const [semesterWritable, setSemesterWritable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingKelasId, setSavingKelasId] = useState<string | null>(null);
  const [warningsByKelas, setWarningsByKelas] = useState<Record<string, RuleWarning[]>>({});

  async function load() {
    if (!semesterId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/plotting?prodiId=${prodiId}&semesterPeriodeId=${semesterId}`);
      if (!res.ok) throw new Error("Failed to load plotting data");
      const data = await res.json();
      setProdi(data.prodi);
      setMk(data.mataKuliah.find((m: MataKuliahRow) => m.id === mataKuliahId) ?? null);
      setSemesterWritable(data.canWrite);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load plotting data");
    } finally {
      setLoading(false);
    }
  }

  async function loadDosenOptions() {
    if (!semesterId) return;
    try {
      const res = await fetch(`/api/plotting/dosen-options?semesterPeriodeId=${semesterId}`);
      if (!res.ok) return;
      const data = await res.json();
      setDosenOptions(data.dosen);
    } catch {
      // non-fatal
    }
  }

  useEffect(() => {
    load();
    loadDosenOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prodiId, mataKuliahId, semesterId]);

  const effectiveCanEdit = canEdit && semesterWritable;

  function addDlbOption(dosen: DosenOption) {
    setDosenOptions((prev) => [...prev, dosen].sort((a, b) => a.kode.localeCompare(b.kode)));
  }

  async function assignDosen(kelasId: string, dosenId: string) {
    setSavingKelasId(kelasId);
    try {
      const res = await fetch(`/api/plotting/kelas/${kelasId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dosenId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed to assign");
      setWarningsByKelas((prev) => ({ ...prev, [kelasId]: data.warnings ?? [] }));
      toast.success("Dosen assigned");
      await Promise.all([load(), loadDosenOptions()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to assign dosen");
    } finally {
      setSavingKelasId(null);
    }
  }

  async function clearDosen(kelasId: string) {
    setSavingKelasId(kelasId);
    try {
      const res = await fetch(`/api/plotting/kelas/${kelasId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dosenId: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed to clear");
      setWarningsByKelas((prev) => ({ ...prev, [kelasId]: [] }));
      toast.success("Dosen cleared");
      await Promise.all([load(), loadDosenOptions()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to clear dosen");
    } finally {
      setSavingKelasId(null);
    }
  }

  const allWarnings = Object.values(warningsByKelas).flat();

  return (
    <div className="space-y-6">
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
        {mk && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium text-foreground">
              {mk.kodeMK} — {mk.nama}
            </span>
          </>
        )}
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}
      {!loading && !semesterWritable && canEdit && (
        <Alert>
          <AlertDescription>
            This semester is read-only. Switch to the active semester to make changes.
          </AlertDescription>
        </Alert>
      )}
      {allWarnings.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
          <AlertDescription className="space-y-1 text-amber-800 dark:text-amber-400">
            {allWarnings.map((w, i) => <p key={i}>{w.message}</p>)}
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
        </div>
      ) : !mk ? (
        <Card>
          <CardContent>
            <EmptyState icon={CalendarRange} title="Mata Kuliah not found" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-foreground">
                {mk.kodeMK} — {mk.nama}
              </span>
              <span className="text-xs text-muted-foreground">
                ({mk.sks} sks{mk.ket ? `, ${mk.ket}` : ""})
              </span>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {mk.courseOfferings.length === 0 ? (
                <p className="text-xs text-muted-foreground">No classes opened yet for this Mata Kuliah.</p>
              ) : (
                [...mk.courseOfferings]
                  .sort((a, b) => b.tahunAngkatan - a.tahunAngkatan || a.semesterKe - b.semesterKe)
                  .flatMap((co) =>
                    co.kelas.map((k) => (
                      <SectionChip
                        key={k.id}
                        kelas={k}
                        semesterKe={co.semesterKe}
                        tahunAngkatan={co.tahunAngkatan}
                        canEdit={effectiveCanEdit}
                        dosenOptions={dosenOptions}
                        semesterId={semesterId}
                        canRegisterDlb={canRegisterDlb}
                        context={{
                          prodiKode: prodi?.kode ?? "",
                          prodiNama: prodi?.nama ?? "",
                          kodeMK: mk.kodeMK,
                          mkNama: mk.nama,
                          kodeKelas: k.kodeKelas,
                          sks: k.sks,
                        }}
                        onAssign={(dosenId) => assignDosen(k.id, dosenId)}
                        onClear={() => clearDosen(k.id)}
                        onDlbRegistered={addDlbOption}
                        saving={savingKelasId === k.id}
                      />
                    )),
                  )
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
