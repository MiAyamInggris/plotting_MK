"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, X, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useSemester } from "@/components/SemesterContext";
import { cn } from "@/lib/utils";
import DosenPicker, { type AssignContext, type DosenOption } from "./DosenPicker";

type Dosen = { id: string; kode: string; nama: string; kkId: string | null; aktif: boolean };
type Kelas = {
  id: string;
  kodeKelas: string;
  sectionSuffix: string;
  sks: number;
  dosenId: string | null;
  dosen: Dosen | null;
  assignedBy: { name: string } | null;
};
type CourseOffering = {
  id: string;
  semesterKe: number;
  tahunAngkatan: number;
  kelasPrefix: string;
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
type ProdiSummary = {
  prodiId: string;
  kode: string;
  nama: string;
  unplottedMataKuliah: number;
  unplottedSks: number;
};
type RuleWarning = { level: "error" | "warning"; code: string; message: string };

function SectionChip({
  kelas,
  canEdit,
  canManageSections,
  dosenOptions,
  context,
  semesterId,
  canRegisterDlb,
  onAssign,
  onClear,
  onRemove,
  onDlbRegistered,
  saving,
}: {
  kelas: Kelas;
  canEdit: boolean;
  canManageSections: boolean;
  dosenOptions: DosenOption[];
  context: AssignContext;
  semesterId: string;
  canRegisterDlb: boolean;
  onAssign: (dosenId: string) => void;
  onClear: () => void;
  onRemove: () => void;
  onDlbRegistered: (dosen: DosenOption) => void;
  saving: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs">
      <span className="font-mono text-muted-foreground">{kelas.sectionSuffix}</span>
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
      {canManageSections && (
        <ConfirmDialog
          trigger={
            <Button
              variant="outline"
              size="icon-sm"
              className="size-6 text-destructive"
              disabled={saving}
            >
              <X className="size-3" />
            </Button>
          }
          title="Remove this section?"
          description={`Section ${kelas.sectionSuffix} will be permanently removed. This cannot be undone.`}
          onConfirm={onRemove}
        />
      )}
    </div>
  );
}

export default function PlottingClient({
  defaultProdiId,
  canEdit,
  canManageSections,
  canRegisterDlb,
}: {
  defaultProdiId: string | null;
  canEdit: boolean;
  canManageSections: boolean;
  canRegisterDlb: boolean;
}) {
  const { semesterId } = useSemester();
  const [prodiSummary, setProdiSummary] = useState<ProdiSummary[]>([]);
  const [selectedProdiId, setSelectedProdiId] = useState(defaultProdiId ?? "");
  const [dosenOptions, setDosenOptions] = useState<DosenOption[]>([]);
  const [mataKuliah, setMataKuliah] = useState<MataKuliahRow[]>([]);
  const [semesterWritable, setSemesterWritable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingKelasId, setSavingKelasId] = useState<string | null>(null);
  const [warningsByKelas, setWarningsByKelas] = useState<Record<string, RuleWarning[]>>({});
  const [sectionForms, setSectionForms] = useState<Record<string, string>>({});

  async function loadSummary() {
    if (!semesterId) return;
    try {
      const res = await fetch(`/api/plotting/summary?semesterPeriodeId=${semesterId}`);
      if (!res.ok) return;
      const data = await res.json();
      setProdiSummary(data.summary);
      setSelectedProdiId((prev) =>
        prev && data.summary.some((p: ProdiSummary) => p.prodiId === prev)
          ? prev
          : (defaultProdiId && data.summary.some((p: ProdiSummary) => p.prodiId === defaultProdiId)
              ? defaultProdiId
              : data.summary[0]?.prodiId ?? ""),
      );
    } catch {
      // non-fatal — the board still works without the summary annotations
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

  async function load() {
    if (!selectedProdiId || !semesterId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/plotting?prodiId=${selectedProdiId}&semesterPeriodeId=${semesterId}`,
      );
      if (!res.ok) throw new Error("Failed to load plotting data");
      const data = await res.json();
      setMataKuliah(data.mataKuliah);
      setSemesterWritable(data.canWrite);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load plotting data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
    loadDosenOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesterId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProdiId, semesterId]);

  const effectiveCanEdit = canEdit && semesterWritable;
  const effectiveCanManageSections = canManageSections && semesterWritable;

  const selectedSummary = prodiSummary.find((p) => p.prodiId === selectedProdiId) ?? null;

  const blocks = useMemo(() => {
    const map = new Map<
      string,
      { semesterKe: number; tahunAngkatan: number; rows: { mk: MataKuliahRow; co: CourseOffering }[] }
    >();
    for (const mk of mataKuliah) {
      for (const co of mk.courseOfferings) {
        const key = `${co.semesterKe}|${co.tahunAngkatan}`;
        if (!map.has(key)) {
          map.set(key, { semesterKe: co.semesterKe, tahunAngkatan: co.tahunAngkatan, rows: [] });
        }
        map.get(key)!.rows.push({ mk, co });
      }
    }
    return [...map.values()].sort(
      (a, b) => b.tahunAngkatan - a.tahunAngkatan || a.semesterKe - b.semesterKe,
    );
  }, [mataKuliah]);

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
      await Promise.all([load(), loadSummary(), loadDosenOptions()]);
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
      await Promise.all([load(), loadSummary(), loadDosenOptions()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to clear dosen");
    } finally {
      setSavingKelasId(null);
    }
  }

  async function removeSection(kelasId: string) {
    setSavingKelasId(kelasId);
    try {
      const res = await fetch(`/api/plotting/kelas/${kelasId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to remove section");
      }
      toast.success("Section removed");
      await Promise.all([load(), loadSummary()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove section");
    } finally {
      setSavingKelasId(null);
    }
  }

  async function addSection(courseOfferingId: string, e: FormEvent) {
    e.preventDefault();
    const suffix = sectionForms[courseOfferingId]?.trim();
    if (!suffix) return;
    try {
      const res = await fetch("/api/plotting/kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseOfferingId, sectionSuffix: suffix }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to add section");
      }
      setSectionForms((prev) => ({ ...prev, [courseOfferingId]: "" }));
      toast.success("Section added");
      await Promise.all([load(), loadSummary()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add section");
    }
  }

  const allWarnings = Object.values(warningsByKelas).flat();

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <div className="max-w-md space-y-1.5">
            <Label className="text-xs text-muted-foreground">Program Studi</Label>
            <Select value={selectedProdiId} onValueChange={setSelectedProdiId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {prodiSummary.map((p) => (
                  <SelectItem key={p.prodiId} value={p.prodiId}>
                    {p.kode} — {p.nama} — {p.unplottedMataKuliah} MK / {p.unplottedSks} SKS belum di-plotting
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSummary && (
              <p className="text-xs text-muted-foreground">
                {selectedSummary.unplottedMataKuliah} MK / {selectedSummary.unplottedSks} SKS belum di-plotting
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {loadError && (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}
      {!loading && !semesterWritable && (canEdit || canManageSections) && (
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
          <Skeleton className="h-24 w-full" />
        </div>
      ) : blocks.length === 0 ? (
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
        blocks.map((block) => (
          <div key={`${block.semesterKe}-${block.tahunAngkatan}`} className="space-y-3">
            <h2 className="text-lg font-medium text-foreground">
              Semester {block.semesterKe} | Tahun Angkatan {block.tahunAngkatan}
            </h2>
            <div className="space-y-3">
              {block.rows
                .sort((a, b) => a.mk.kodeMK.localeCompare(b.mk.kodeMK))
                .map(({ mk, co }) => (
                  <Card key={co.id}>
                    <CardContent>
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-foreground">{mk.kodeMK}</span>
                        <span className="text-foreground">{mk.nama}</span>
                        <span className="text-xs text-muted-foreground">
                          ({mk.sks} sks{mk.ket ? `, ${mk.ket}` : ""})
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {co.kelas.map((k) => (
                          <SectionChip
                            key={k.id}
                            kelas={k}
                            canEdit={effectiveCanEdit}
                            canManageSections={effectiveCanManageSections}
                            dosenOptions={dosenOptions}
                            semesterId={semesterId}
                            canRegisterDlb={canRegisterDlb}
                            context={{
                              prodiKode: selectedSummary?.kode ?? "",
                              prodiNama: selectedSummary?.nama ?? "",
                              kodeMK: mk.kodeMK,
                              mkNama: mk.nama,
                              kodeKelas: k.kodeKelas,
                              sks: k.sks,
                            }}
                            onAssign={(dosenId) => assignDosen(k.id, dosenId)}
                            onClear={() => clearDosen(k.id)}
                            onRemove={() => removeSection(k.id)}
                            onDlbRegistered={addDlbOption}
                            saving={savingKelasId === k.id}
                          />
                        ))}
                      </div>
                      {effectiveCanManageSections && (
                        <form
                          onSubmit={(e) => addSection(co.id, e)}
                          className={cn("mt-2 flex items-center gap-2")}
                        >
                          <Input
                            placeholder="new suffix, e.g. 09"
                            className="h-7 w-32 text-xs"
                            value={sectionForms[co.id] ?? ""}
                            onChange={(e) =>
                              setSectionForms((prev) => ({ ...prev, [co.id]: e.target.value }))
                            }
                          />
                          <Button type="submit" variant="outline" size="sm" className="h-7 text-xs">
                            <Plus className="size-3" />
                            Add section
                          </Button>
                        </form>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
