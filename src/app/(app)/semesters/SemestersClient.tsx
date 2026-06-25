"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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

type Tipe = "GANJIL" | "GENAP";

type SemesterPeriode = {
  id: string;
  nama: string;
  tipe: Tipe;
  tahunAjaran: string;
  aktif: boolean;
  visibleToScopedRoles: boolean;
};

type FormState = { nama: string; tipe: Tipe; tahunAjaran: string };
const EMPTY_FORM: FormState = { nama: "", tipe: "GANJIL", tahunAjaran: "" };

export default function SemestersClient() {
  const router = useRouter();
  const [items, setItems] = useState<SemesterPeriode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/semester-periode");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setItems(data.semesterPeriode);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function refreshAll() {
    await load();
    router.refresh();
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/semester-periode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to create");
      }
      setCreateForm(EMPTY_FORM);
      setCreateOpen(false);
      toast.success("Semester created");
      await refreshAll();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  async function setActive(s: SemesterPeriode) {
    setBusyId(s.id);
    try {
      const res = await fetch(`/api/semester-periode/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktif: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to activate");
      }
      toast.success(`${s.nama} is now the active semester`);
      await refreshAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to activate");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleVisibility(s: SemesterPeriode) {
    setBusyId(s.id);
    try {
      const res = await fetch(`/api/semester-periode/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibleToScopedRoles: !s.visibleToScopedRoles }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to update");
      }
      toast.success(
        s.visibleToScopedRoles
          ? `${s.nama} hidden from Kaprodi/Ketua KK`
          : `${s.nama} is now visible (read-only) to Kaprodi/Ketua KK`,
      );
      await refreshAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Semesters</CardTitle>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              New Semester
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Semester</DialogTitle>
            </DialogHeader>
            <form onSubmit={onCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sem-nama">Nama</Label>
                <Input
                  id="sem-nama"
                  required
                  placeholder="e.g. Ganjil 2026/2027"
                  value={createForm.nama}
                  onChange={(e) => setCreateForm({ ...createForm, nama: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sem-tipe">Tipe</Label>
                  <Select
                    value={createForm.tipe}
                    onValueChange={(v) => setCreateForm({ ...createForm, tipe: v as Tipe })}
                  >
                    <SelectTrigger id="sem-tipe" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GANJIL">Ganjil</SelectItem>
                      <SelectItem value="GENAP">Genap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sem-tahun">Tahun Ajaran</Label>
                  <Input
                    id="sem-tahun"
                    required
                    placeholder="2026/2027"
                    value={createForm.tahunAjaran}
                    onChange={(e) => setCreateForm({ ...createForm, tahunAjaran: e.target.value })}
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
              <TableHead className="sticky top-0 bg-card">Nama</TableHead>
              <TableHead className="sticky top-0 bg-card">Tipe</TableHead>
              <TableHead className="sticky top-0 bg-card">Tahun Ajaran</TableHead>
              <TableHead className="sticky top-0 bg-card">Status</TableHead>
              <TableHead className="sticky top-0 bg-card">Visible to Kaprodi/Ketua KK</TableHead>
              <TableHead className="sticky top-0 bg-card text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton columns={6} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    icon={CalendarClock}
                    title="No semesters yet"
                    description="Create one to get started."
                  />
                </TableCell>
              </TableRow>
            ) : (
              items.map((s) => (
                <TableRow key={s.id} className="h-12">
                  <TableCell className="font-medium">{s.nama}</TableCell>
                  <TableCell>{s.tipe}</TableCell>
                  <TableCell>{s.tahunAjaran}</TableCell>
                  <TableCell>
                    <Badge variant={s.aktif ? "default" : "secondary"}>
                      {s.aktif ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {s.aktif ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      <Badge variant="outline">{s.visibleToScopedRoles ? "Visible" : "Hidden"}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {!s.aktif && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId === s.id}
                          onClick={() => toggleVisibility(s)}
                        >
                          {s.visibleToScopedRoles ? "Hide" : "Show"}
                        </Button>
                      )}
                      {!s.aktif && (
                        <ConfirmDialog
                          trigger={
                            <Button variant="outline" size="sm" disabled={busyId === s.id}>
                              Set as active
                            </Button>
                          }
                          title="Set as active semester?"
                          description={`${s.nama} will become the active semester. All Kaprodi and Ketua KK will only be able to edit this semester until it changes.`}
                          confirmLabel="Set as active"
                          variant="default"
                          onConfirm={() => setActive(s)}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {!loading && <p className="text-sm text-muted-foreground">{items.length} item(s)</p>}
      </CardContent>
    </Card>
  );
}
