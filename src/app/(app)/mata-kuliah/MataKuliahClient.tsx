"use client";

import { Fragment, useEffect, useState, type FormEvent } from "react";
import { ChevronDown, ChevronRight, Plus, BookOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

type MataKuliah = {
  id: string;
  kodeMK: string;
  nama: string;
  sks: number;
  ket: string | null;
  prodiId: string;
  prodi: { kode: string; nama: string };
  courseOfferings: CourseOffering[];
};

type ProgramStudi = { id: string; kode: string; nama: string };

type CreateForm = { kodeMK: string; nama: string; sks: string; ket: string };
const EMPTY_CREATE: CreateForm = { kodeMK: "", nama: "", sks: "", ket: "" };

function OfferingRows({
  offerings,
  canManage,
  onDelete,
}: {
  offerings: CourseOffering[];
  canManage: boolean;
  onDelete: (id: string) => void;
}) {
  if (offerings.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={6} className="text-center text-muted-foreground">
          No offerings yet.
        </TableCell>
      </TableRow>
    );
  }
  return (
    <>
      {offerings.map((co) => (
        <TableRow key={co.id}>
          <TableCell>{co.semesterKe}</TableCell>
          <TableCell>{co.tahunAngkatan}</TableCell>
          <TableCell>{co.kelasPrefix}</TableCell>
          <TableCell className="text-right">{co.kelas.length}</TableCell>
          <TableCell className="text-right">
            {co.kelas.reduce((sum, k) => sum + (k.dosenId ? k.sks : 0), 0)}
          </TableCell>
          <TableCell className="text-right">
            {canManage && (
              <ConfirmDialog
                trigger={
                  <Button variant="outline" size="sm" className="text-destructive">
                    Remove
                  </Button>
                }
                title="Remove this offering?"
                description="This cannot be undone."
                onConfirm={() => onDelete(co.id)}
              />
            )}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function MataKuliahClient({
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

  const [items, setItems] = useState<MataKuliah[]>([]);
  const [semesterWritable, setSemesterWritable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [offeringForms, setOfferingForms] = useState<
    Record<string, { semesterKe: string; tahunAngkatan: string; kelasPrefix: string }>
  >({});

  async function load() {
    if (!selectedProdiId || !semesterId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/mata-kuliah?prodiId=${selectedProdiId}&semesterPeriodeId=${semesterId}`,
      );
      if (!res.ok) throw new Error("Failed to load mata kuliah");
      const data = await res.json();
      setItems(data.mataKuliah);
      setSemesterWritable(data.canWrite);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load mata kuliah");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProdiId, semesterId]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/mata-kuliah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kodeMK: createForm.kodeMK,
          nama: createForm.nama,
          sks: Number(createForm.sks),
          prodiId: selectedProdiId,
          ket: createForm.ket || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to create");
      }
      setCreateForm(EMPTY_CREATE);
      setCreateOpen(false);
      toast.success("Mata Kuliah created");
      await load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  async function deleteMataKuliah(id: string) {
    try {
      const res = await fetch(`/api/mata-kuliah/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to delete");
      }
      toast.success("Mata Kuliah deleted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  function offeringForm(mkId: string) {
    return offeringForms[mkId] ?? { semesterKe: "", tahunAngkatan: "", kelasPrefix: "" };
  }

  async function onCreateOffering(mkId: string, e: FormEvent) {
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
        throw new Error(typeof data.error === "string" ? data.error : "Failed to create offering");
      }
      setOfferingForms((prev) => ({
        ...prev,
        [mkId]: { semesterKe: "", tahunAngkatan: "", kelasPrefix: "" },
      }));
      toast.success("Offering added");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create offering");
    }
  }

  async function deleteOffering(id: string) {
    try {
      const res = await fetch(`/api/course-offerings/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to delete offering");
      }
      toast.success("Offering removed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete offering");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>Mata Kuliah &amp; SKS</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
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

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button disabled={!selectedProdiId}>
                <Plus className="size-4" />
                Add Mata Kuliah
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Mata Kuliah</DialogTitle>
              </DialogHeader>
              <form onSubmit={onCreate} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="mk-kode">Kode MK</Label>
                    <Input
                      id="mk-kode"
                      required
                      value={createForm.kodeMK}
                      onChange={(e) => setCreateForm({ ...createForm, kodeMK: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mk-sks">SKS</Label>
                    <Input
                      id="mk-sks"
                      required
                      type="number"
                      step="0.5"
                      min="0"
                      value={createForm.sks}
                      onChange={(e) => setCreateForm({ ...createForm, sks: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="mk-nama">Nama</Label>
                    <Input
                      id="mk-nama"
                      required
                      value={createForm.nama}
                      onChange={(e) => setCreateForm({ ...createForm, nama: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="mk-ket">Ket</Label>
                    <Input
                      id="mk-ket"
                      value={createForm.ket}
                      onChange={(e) => setCreateForm({ ...createForm, ket: e.target.value })}
                    />
                  </div>
                </div>
                {createError && <p className="text-sm text-destructive">{createError}</p>}
                <DialogFooter>
                  <Button type="submit" disabled={creating}>
                    {creating ? "Creating…" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky top-0 w-8 bg-card" />
              <TableHead className="sticky top-0 bg-card">Kode MK</TableHead>
              <TableHead className="sticky top-0 bg-card">Nama</TableHead>
              <TableHead className="sticky top-0 bg-card text-right">SKS</TableHead>
              <TableHead className="sticky top-0 bg-card">Ket</TableHead>
              <TableHead className="sticky top-0 bg-card text-right">Offerings</TableHead>
              <TableHead className="sticky top-0 bg-card text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton columns={7} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    icon={BookOpen}
                    title="No Mata Kuliah found"
                    description="No mata kuliah found for this prodi."
                  />
                </TableCell>
              </TableRow>
            ) : (
              items.map((mk) => {
                const expanded = expandedId === mk.id;
                const form = offeringForm(mk.id);
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
                      <TableCell className="text-muted-foreground">{mk.ket ?? "—"}</TableCell>
                      <TableCell className="text-right">{mk.courseOfferings.length}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <ConfirmDialog
                          trigger={
                            <Button variant="outline" size="icon-sm" className="text-destructive">
                              <Trash2 className="size-4" />
                            </Button>
                          }
                          title="Delete Mata Kuliah?"
                          description={`This will permanently delete ${mk.kodeMK} — ${mk.nama}. This cannot be undone.`}
                          onConfirm={() => deleteMataKuliah(mk.id)}
                        />
                      </TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={7} className="space-y-3 p-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Semester</TableHead>
                                <TableHead>Angkatan</TableHead>
                                <TableHead>Prefix</TableHead>
                                <TableHead className="text-right">Sections</TableHead>
                                <TableHead className="text-right">Total SKS plotted</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <OfferingRows
                                offerings={mk.courseOfferings}
                                canManage={semesterWritable}
                                onDelete={deleteOffering}
                              />
                            </TableBody>
                          </Table>

                          {!semesterWritable && (
                            <p className="text-sm text-muted-foreground">
                              This semester is read-only — switch to the active semester to add or
                              remove offerings.
                            </p>
                          )}

                          {semesterWritable && (
                            <form
                              onSubmit={(e) => onCreateOffering(mk.id, e)}
                              className="flex flex-wrap items-end gap-3"
                            >
                              <div className="space-y-1.5">
                                <Label className="text-xs">Semester ke</Label>
                                <Input
                                  required
                                  type="number"
                                  className="w-24"
                                  value={form.semesterKe}
                                  onChange={(e) =>
                                    setOfferingForms((prev) => ({
                                      ...prev,
                                      [mk.id]: { ...form, semesterKe: e.target.value },
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
                                  value={form.tahunAngkatan}
                                  onChange={(e) =>
                                    setOfferingForms((prev) => ({
                                      ...prev,
                                      [mk.id]: { ...form, tahunAngkatan: e.target.value },
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
                                  value={form.kelasPrefix}
                                  onChange={(e) =>
                                    setOfferingForms((prev) => ({
                                      ...prev,
                                      [mk.id]: { ...form, kelasPrefix: e.target.value },
                                    }))
                                  }
                                />
                              </div>
                              <Button type="submit" variant="outline" size="sm">
                                <Plus className="size-4" />
                                Add offering
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
