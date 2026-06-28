"use client";

import { Fragment, useEffect, useState, type FormEvent } from "react";
import { ChevronDown, ChevronRight, Plus, Settings2, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useSemester } from "@/components/SemesterContext";

type Role = "ADMIN" | "KAPRODI" | "KETUA_KK";

type Kelas = {
  id: string;
  kodeKelas: string;
  sectionSuffix: string;
  sks: number;
  dosenId: string | null;
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
type Prodi = { id: string; kode: string; nama: string };
type ProgramStudi = { id: string; kode: string; nama: string };

type OfferingForm = { semesterKe: string; tahunAngkatan: string; kelasPrefix: string };
const EMPTY_OFFERING_FORM: OfferingForm = { semesterKe: "", tahunAngkatan: "", kelasPrefix: "" };

function ClassRow({
  kelas,
  canWrite,
  onRemove,
  onRename,
}: {
  kelas: Kelas;
  canWrite: boolean;
  onRemove: () => void;
  onRename: (newSuffix: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [suffix, setSuffix] = useState(kelas.sectionSuffix);
  const plotted = kelas.dosenId !== null;

  if (editing) {
    return (
      <div className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs">
        <Input
          autoFocus
          value={suffix}
          onChange={(e) => setSuffix(e.target.value)}
          className="h-6 w-20 px-1.5 text-xs"
        />
        <Button
          variant="outline"
          size="icon-sm"
          className="size-6"
          onClick={() => {
            onRename(suffix);
            setEditing(false);
          }}
        >
          <Check className="size-3" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          className="size-6"
          onClick={() => {
            setSuffix(kelas.sectionSuffix);
            setEditing(false);
          }}
        >
          <X className="size-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs">
      <span className="font-mono text-muted-foreground">{kelas.sectionSuffix}</span>
      <Badge variant={plotted ? "default" : "secondary"} className="text-[10px]">
        {plotted ? "Sudah di-plotting" : "Belum di-plotting"}
      </Badge>
      {canWrite && !plotted && (
        <>
          <Button variant="outline" size="icon-sm" className="size-6" onClick={() => setEditing(true)}>
            <Pencil className="size-3" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="outline" size="icon-sm" className="size-6 text-destructive">
                <Trash2 className="size-3" />
              </Button>
            }
            title="Remove this class?"
            description={`Class ${kelas.kodeKelas} will be permanently removed. This cannot be undone.`}
            onConfirm={onRemove}
          />
        </>
      )}
    </div>
  );
}

export default function SettingMkKelasClient({
  role,
  userProdiId,
  programStudi,
}: {
  role: Role;
  userProdiId: string | null;
  programStudi: ProgramStudi[];
}) {
  const isKaprodi = role === "KAPRODI";
  const { semesterId } = useSemester();
  const [selectedProdiId, setSelectedProdiId] = useState(
    isKaprodi ? userProdiId ?? "" : programStudi[0]?.id ?? "",
  );

  const [prodi, setProdi] = useState<Prodi | null>(null);
  const [items, setItems] = useState<MataKuliahRow[]>([]);
  const [canWrite, setCanWrite] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [offeringForms, setOfferingForms] = useState<Record<string, OfferingForm>>({});
  const [classForms, setClassForms] = useState<Record<string, string>>({});

  async function load() {
    if (!selectedProdiId || !semesterId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/plotting?prodiId=${selectedProdiId}&semesterPeriodeId=${semesterId}`);
      if (!res.ok) throw new Error("Failed to load Mata Kuliah");
      const data = await res.json();
      setProdi(data.prodi);
      setItems(data.mataKuliah);
      setCanWrite(data.canWrite);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load Mata Kuliah");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProdiId, semesterId]);

  function offeringForm(mkId: string) {
    return offeringForms[mkId] ?? EMPTY_OFFERING_FORM;
  }

  async function openOffering(mkId: string, e: FormEvent) {
    e.preventDefault();
    const form = offeringForm(mkId);
    try {
      const res = await fetch("/api/course-offerings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mataKuliahId: mkId,
          semesterKe: Number(form.semesterKe),
          tahunAngkatan: Number(form.tahunAngkatan),
          kelasPrefix: form.kelasPrefix,
          semesterPeriodeId: semesterId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to open Mata Kuliah");
      }
      setOfferingForms((prev) => ({ ...prev, [mkId]: EMPTY_OFFERING_FORM }));
      toast.success("Mata Kuliah opened for this semester");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open Mata Kuliah");
    }
  }

  async function unopenOffering(id: string) {
    try {
      const res = await fetch(`/api/course-offerings/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to un-open");
      }
      toast.success("Offering removed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to un-open");
    }
  }

  async function addClass(courseOfferingId: string, e: FormEvent) {
    e.preventDefault();
    const suffix = classForms[courseOfferingId]?.trim();
    if (!suffix) return;
    try {
      const res = await fetch("/api/plotting/kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseOfferingId, sectionSuffix: suffix }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to add class");
      }
      setClassForms((prev) => ({ ...prev, [courseOfferingId]: "" }));
      toast.success("Class added");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add class");
    }
  }

  async function removeClass(id: string) {
    try {
      const res = await fetch(`/api/plotting/kelas/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to remove class");
      }
      toast.success("Class removed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove class");
    }
  }

  async function renameClass(id: string, sectionSuffix: string) {
    try {
      const res = await fetch(`/api/plotting/kelas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionSuffix }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to rename class");
      }
      toast.success("Class renamed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to rename class");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>Setting MK dan Kelas</CardTitle>
        {!isKaprodi && (
          <Select value={selectedProdiId} onValueChange={setSelectedProdiId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select Program Studi" />
            </SelectTrigger>
            <SelectContent>
              {programStudi.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.kode} — {p.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {prodi ? `${prodi.kode} — ${prodi.nama}` : ""} — open catalog Mata Kuliah for the selected
          semester and manage their classes. Dosen assignment happens on the Plotting board.
        </p>

        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}
        {!loading && !canWrite && (
          <Alert>
            <AlertDescription>
              This semester is read-only. Switch to the active semester to make changes.
            </AlertDescription>
          </Alert>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky top-0 w-8 bg-card" />
              <TableHead className="sticky top-0 bg-card">Kode MK</TableHead>
              <TableHead className="sticky top-0 bg-card">Nama</TableHead>
              <TableHead className="sticky top-0 bg-card text-right">SKS</TableHead>
              <TableHead className="sticky top-0 bg-card text-right">Offerings</TableHead>
              <TableHead className="sticky top-0 bg-card text-right">Kelas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton columns={6} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    icon={Settings2}
                    title="No Mata Kuliah in the catalog"
                    description="Add Mata Kuliah to the catalog first, on the Mata Kuliah page."
                  />
                </TableCell>
              </TableRow>
            ) : (
              items.map((mk) => {
                const expanded = expandedId === mk.id;
                const totalKelas = mk.courseOfferings.reduce((sum, co) => sum + co.kelas.length, 0);
                return (
                  <Fragment key={mk.id}>
                    <TableRow
                      className="h-12 cursor-pointer"
                      onClick={() => setExpandedId(expanded ? null : mk.id)}
                    >
                      <TableCell>
                        {expanded ? (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{mk.kodeMK}</TableCell>
                      <TableCell>{mk.nama}</TableCell>
                      <TableCell className="text-right">{mk.sks}</TableCell>
                      <TableCell className="text-right">{mk.courseOfferings.length}</TableCell>
                      <TableCell className="text-right">{totalKelas}</TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={6} className="space-y-4 p-4">
                          {mk.courseOfferings.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Not opened for this semester yet.
                            </p>
                          ) : (
                            mk.courseOfferings.map((co) => (
                              <div key={co.id} className="space-y-2 rounded-md border border-border p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-medium text-foreground">
                                    Semester {co.semesterKe} · Angkatan {co.tahunAngkatan} · Prefix{" "}
                                    {co.kelasPrefix}
                                  </p>
                                  {canWrite && co.kelas.length === 0 && (
                                    <ConfirmDialog
                                      trigger={
                                        <Button variant="outline" size="sm" className="text-destructive">
                                          Un-open
                                        </Button>
                                      }
                                      title="Un-open this Mata Kuliah?"
                                      description="This removes the offering for this semester. This cannot be undone."
                                      onConfirm={() => unopenOffering(co.id)}
                                    />
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {co.kelas.map((k) => (
                                    <ClassRow
                                      key={k.id}
                                      kelas={k}
                                      canWrite={canWrite}
                                      onRemove={() => removeClass(k.id)}
                                      onRename={(suffix) => renameClass(k.id, suffix)}
                                    />
                                  ))}
                                </div>
                                {canWrite && (
                                  <form
                                    onSubmit={(e) => addClass(co.id, e)}
                                    className="flex items-center gap-2"
                                  >
                                    <Input
                                      placeholder="new suffix, e.g. 01"
                                      className="h-7 w-32 text-xs"
                                      value={classForms[co.id] ?? ""}
                                      onChange={(e) =>
                                        setClassForms((prev) => ({ ...prev, [co.id]: e.target.value }))
                                      }
                                    />
                                    <Button type="submit" variant="outline" size="sm" className="h-7 text-xs">
                                      <Plus className="size-3" />
                                      Add class
                                    </Button>
                                  </form>
                                )}
                              </div>
                            ))
                          )}

                          {canWrite && (
                            <form
                              onSubmit={(e) => openOffering(mk.id, e)}
                              className="flex flex-wrap items-end gap-3"
                            >
                              <div className="space-y-1.5">
                                <Label className="text-xs">Semester ke</Label>
                                <Input
                                  required
                                  type="number"
                                  className="w-24"
                                  value={offeringForm(mk.id).semesterKe}
                                  onChange={(e) =>
                                    setOfferingForms((prev) => ({
                                      ...prev,
                                      [mk.id]: { ...offeringForm(mk.id), semesterKe: e.target.value },
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Tahun angkatan</Label>
                                <Input
                                  required
                                  type="number"
                                  className="w-28"
                                  value={offeringForm(mk.id).tahunAngkatan}
                                  onChange={(e) =>
                                    setOfferingForms((prev) => ({
                                      ...prev,
                                      [mk.id]: { ...offeringForm(mk.id), tahunAngkatan: e.target.value },
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Kelas prefix</Label>
                                <Input
                                  required
                                  placeholder="S1IF-10-"
                                  className="w-40"
                                  value={offeringForm(mk.id).kelasPrefix}
                                  onChange={(e) =>
                                    setOfferingForms((prev) => ({
                                      ...prev,
                                      [mk.id]: { ...offeringForm(mk.id), kelasPrefix: e.target.value },
                                    }))
                                  }
                                />
                              </div>
                              <Button type="submit" variant="outline" size="sm">
                                <Plus className="size-4" />
                                {mk.courseOfferings.length === 0 ? "Open for this semester" : "Open another offering"}
                              </Button>
                            </form>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
