"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Plus, BookOpen, Trash2, Upload } from "lucide-react";
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
import { cn } from "@/lib/utils";

type Role = "ADMIN" | "KAPRODI" | "KETUA_KK";

type MataKuliah = {
  id: string;
  kodeMK: string;
  nama: string;
  sks: number;
  ket: string | null;
  prodiId: string;
  prodi: { kode: string; nama: string };
};

type ProgramStudi = { id: string; kode: string; nama: string };

type CreateForm = { kodeMK: string; nama: string; sks: string; ket: string };
const EMPTY_CREATE: CreateForm = { kodeMK: "", nama: "", sks: "", ket: "" };

type ImportWarning = { level: "warning" | "error"; message: string; context?: string };
type ImportReport = { counts: Record<string, number>; warnings: ImportWarning[] };

function ImportReportView({ report }: { report: ImportReport }) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        {Object.entries(report.counts).map(([key, value]) => (
          <div
            key={key}
            className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-1.5"
          >
            <dt className="text-muted-foreground">{key}</dt>
            <dd className="font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      {report.warnings.length > 0 && (
        <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
          {report.warnings.map((w, i) => (
            <li
              key={i}
              className={cn(
                "rounded-md px-2.5 py-1.5",
                w.level === "error"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
              )}
            >
              {w.context && <span className="font-mono text-xs opacity-70">[{w.context}] </span>}
              {w.message}
            </li>
          ))}
        </ul>
      )}
    </div>
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
  const [selectedProdiId, setSelectedProdiId] = useState(
    isKaprodi ? userProdiId ?? "" : programStudi[0]?.id ?? "",
  );

  const [items, setItems] = useState<MataKuliah[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    if (!selectedProdiId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/mata-kuliah?prodiId=${selectedProdiId}`);
      if (!res.ok) throw new Error("Failed to load mata kuliah");
      const data = await res.json();
      setItems(data.mataKuliah);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load mata kuliah");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProdiId]);

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

  async function onImport(e: FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file || !selectedProdiId) return;
    setImporting(true);
    setImportError(null);
    setImportReport(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("prodiId", selectedProdiId);
      const res = await fetch("/api/import/mata-kuliah", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Import failed");
      setImportReport(data.report);
      toast.success("Import finished");
      await load();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
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

          <Dialog
            open={importOpen}
            onOpenChange={(open) => {
              setImportOpen(open);
              if (!open) {
                setImportReport(null);
                setImportError(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" disabled={!selectedProdiId}>
                <Upload className="size-4" />
                Import Mata Kuliah
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Mata Kuliah</DialogTitle>
              </DialogHeader>
              <form onSubmit={onImport} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mk-import-file">
                    .xlsx with columns: No | Kode MK | Nama MK | SKS
                  </Label>
                  <Input id="mk-import-file" type="file" accept=".xlsx,.xls" ref={fileInputRef} required />
                </div>
                {importError && <p className="text-sm text-destructive">{importError}</p>}
                {importReport && <ImportReportView report={importReport} />}
                <DialogFooter>
                  <Button type="submit" disabled={importing}>
                    {importing ? "Importing…" : "Import"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

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
              <TableHead className="sticky top-0 bg-card">Kode MK</TableHead>
              <TableHead className="sticky top-0 bg-card">Nama</TableHead>
              <TableHead className="sticky top-0 bg-card text-right">SKS</TableHead>
              <TableHead className="sticky top-0 bg-card">Ket</TableHead>
              <TableHead className="sticky top-0 bg-card text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton columns={5} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState
                    icon={BookOpen}
                    title="No Mata Kuliah found"
                    description="No mata kuliah found for this prodi."
                  />
                </TableCell>
              </TableRow>
            ) : (
              items.map((mk) => (
                <TableRow key={mk.id} className="h-12">
                  <TableCell className="font-medium">{mk.kodeMK}</TableCell>
                  <TableCell>{mk.nama}</TableCell>
                  <TableCell className="text-right">{mk.sks}</TableCell>
                  <TableCell className="text-muted-foreground">{mk.ket ?? "—"}</TableCell>
                  <TableCell className="text-right">
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
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
