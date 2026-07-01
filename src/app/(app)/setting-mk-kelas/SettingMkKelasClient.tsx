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

type Kelas = { id: string; kodeKelas: string; dosenId: string | null };
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
type ProgramStudi = { id: string; kode: string; nama: string };

// One CourseOffering = one Kelas (Refinement 09); flattened to a single row.
type ClassRowData = {
  offeringId: string;
  kelasId: string | null;
  kodeKelas: string;
  semesterKe: number;
  tahunAngkatan: number;
  dosenId: string | null;
};

type OpenForm = { semesterKe: string; tahunAngkatan: string; kodeKelas: string };
const EMPTY_OPEN_FORM: OpenForm = { semesterKe: "", tahunAngkatan: "", kodeKelas: "" };

function ClassRow({
  row,
  canWrite,
  onRemove,
  onRename,
}: {
  row: ClassRowData;
  canWrite: boolean;
  onRemove: () => void;
  onRename: (newKodeKelas: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(row.kodeKelas);
  const plotted = row.dosenId !== null;

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
      <span className="text-xs text-muted-foreground">
        Sem {row.semesterKe} · Angkatan {row.tahunAngkatan}
      </span>

      {editing ? (
        <>
          <Input
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-7 w-40 text-xs"
          />
          <Button
            variant="outline"
            size="icon-sm"
            className="size-6"
            onClick={() => {
              onRename(code);
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
              setCode(row.kodeKelas);
              setEditing(false);
            }}
          >
            <X className="size-3" />
          </Button>
        </>
      ) : (
        <>
          <span className="font-mono font-medium">{row.kodeKelas}</span>
          <Badge variant={plotted ? "default" : "secondary"} className="text-[10px]">
            {plotted ? "Sudah Ditetapkan" : "Belum Ditetapkan"}
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
                title="Batal Buka Kelas?"
                description={`Kelas ${row.kodeKelas} akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.`}
                onConfirm={onRemove}
              />
            </>
          )}
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

  const [openForms, setOpenForms] = useState<Record<string, OpenForm>>({});

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

  function openForm(mkId: string) {
    return openForms[mkId] ?? EMPTY_OPEN_FORM;
  }

  function classRows(mk: MataKuliahRow): ClassRowData[] {
    return mk.courseOfferings.map((co) => ({
      offeringId: co.id,
      kelasId: co.kelas[0]?.id ?? null,
      kodeKelas: co.kelas[0]?.kodeKelas ?? "",
      semesterKe: co.semesterKe,
      tahunAngkatan: co.tahunAngkatan,
      dosenId: co.kelas[0]?.dosenId ?? null,
    }));
  }

  async function openClass(mkId: string, e: FormEvent) {
    e.preventDefault();
    const form = openForm(mkId);
    try {
      const res = await fetch("/api/course-offerings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mataKuliahId: mkId,
          semesterKe: Number(form.semesterKe),
          tahunAngkatan: Number(form.tahunAngkatan),
          kodeKelas: form.kodeKelas,
          semesterPeriodeId: semesterId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to open class");
      }
      setOpenForms((prev) => ({ ...prev, [mkId]: EMPTY_OPEN_FORM }));
      toast.success("Class opened");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open class");
    }
  }

  async function removeClass(offeringId: string) {
    try {
      const res = await fetch(`/api/course-offerings/${offeringId}`, { method: "DELETE" });
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

  async function renameClass(kelasId: string, kodeKelas: string) {
    try {
      const res = await fetch(`/api/plotting/kelas/${kelasId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kodeKelas }),
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
        <CardTitle>Pengaturan Mata Kuliah dan Kelas</CardTitle>
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
              <TableHead className="sticky top-0 bg-card text-right">Kelas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton columns={5} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
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
                const rows = classRows(mk);
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
                      <TableCell className="text-right">{rows.length}</TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={5} className="space-y-4 p-4">
                          {rows.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Not opened for this semester yet.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {rows.map((row) => (
                                <ClassRow
                                  key={row.offeringId}
                                  row={row}
                                  canWrite={canWrite}
                                  onRemove={() => removeClass(row.offeringId)}
                                  onRename={(code) => row.kelasId && renameClass(row.kelasId, code)}
                                />
                              ))}
                            </div>
                          )}

                          {canWrite && (
                            <form
                              onSubmit={(e) => openClass(mk.id, e)}
                              className="flex flex-wrap items-end gap-3"
                            >
                              <div className="space-y-1.5">
                                <Label className="text-xs">Semester ke</Label>
                                <Input
                                  required
                                  type="number"
                                  className="w-24"
                                  value={openForm(mk.id).semesterKe}
                                  onChange={(e) =>
                                    setOpenForms((prev) => ({
                                      ...prev,
                                      [mk.id]: { ...openForm(mk.id), semesterKe: e.target.value },
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
                                  value={openForm(mk.id).tahunAngkatan}
                                  onChange={(e) =>
                                    setOpenForms((prev) => ({
                                      ...prev,
                                      [mk.id]: { ...openForm(mk.id), tahunAngkatan: e.target.value },
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Kelas</Label>
                                <Input
                                  required
                                  placeholder="S1IF-10-01"
                                  className="w-40"
                                  value={openForm(mk.id).kodeKelas}
                                  onChange={(e) =>
                                    setOpenForms((prev) => ({
                                      ...prev,
                                      [mk.id]: { ...openForm(mk.id), kodeKelas: e.target.value },
                                    }))
                                  }
                                />
                              </div>
                              <Button type="submit" variant="outline" size="sm">
                                <Plus className="size-4" />
                                {rows.length === 0 ? "Buka MK untuk Semester Ini" : "Tambah Kelas"}
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
