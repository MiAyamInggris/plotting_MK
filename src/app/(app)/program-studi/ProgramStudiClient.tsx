"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Building2 } from "lucide-react";
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
import { StatusBadge } from "@/components/StatusBadge";

type Jenjang = "S1" | "D3";

type ProgramStudi = {
  id: string;
  kode: string;
  nama: string;
  jenjang: Jenjang;
  aktif: boolean;
};

type FormState = { kode: string; nama: string; jenjang: Jenjang };
const EMPTY_FORM: FormState = { kode: "", nama: "", jenjang: "S1" };

function ProgramStudiFields({
  value,
  onChange,
}: {
  value: FormState;
  onChange: (next: FormState) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="ps-kode">Kode</Label>
        <Input
          id="ps-kode"
          required
          value={value.kode}
          onChange={(e) => onChange({ ...value, kode: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ps-nama">Nama</Label>
        <Input
          id="ps-nama"
          required
          value={value.nama}
          onChange={(e) => onChange({ ...value, nama: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ps-jenjang">Jenjang</Label>
        <Select
          value={value.jenjang}
          onValueChange={(v) => onChange({ ...value, jenjang: v as Jenjang })}
        >
          <SelectTrigger id="ps-jenjang" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="S1">S1</SelectItem>
            <SelectItem value="D3">D3</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

export default function ProgramStudiClient() {
  const [items, setItems] = useState<ProgramStudi[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/program-studi");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setItems(data.programStudi);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/program-studi", {
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
      toast.success("Program Studi created");
      await load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(p: ProgramStudi) {
    setEditingId(p.id);
    setEditForm({ kode: p.kode, nama: p.nama, jenjang: p.jenjang });
    setEditError(null);
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/program-studi/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to update");
      }
      setEditingId(null);
      toast.success("Program Studi updated");
      await load();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: ProgramStudi) {
    try {
      const res = await fetch(`/api/program-studi/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktif: !p.aktif }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(p.aktif ? "Program Studi deactivated" : "Program Studi activated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Program Studi</CardTitle>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Add Program Studi
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Program Studi</DialogTitle>
            </DialogHeader>
            <form onSubmit={onCreate} className="space-y-4">
              <ProgramStudiFields value={createForm} onChange={setCreateForm} />
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
              <TableHead className="sticky top-0 bg-card">Kode</TableHead>
              <TableHead className="sticky top-0 bg-card">Nama</TableHead>
              <TableHead className="sticky top-0 bg-card">Jenjang</TableHead>
              <TableHead className="sticky top-0 bg-card">Status</TableHead>
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
                    icon={Building2}
                    title="No Program Studi yet"
                    description="Create one to get started."
                  />
                </TableCell>
              </TableRow>
            ) : (
              items.map((p) => (
                <TableRow key={p.id} className="h-12">
                  <TableCell className="font-medium">{p.kode}</TableCell>
                  <TableCell>{p.nama}</TableCell>
                  <TableCell>{p.jenjang}</TableCell>
                  <TableCell>
                    <StatusBadge active={p.aktif} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(p)}>
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => toggleActive(p)}>
                        {p.aktif ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {!loading && (
          <p className="text-sm text-muted-foreground">{items.length} item(s)</p>
        )}
      </CardContent>

      <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Program Studi</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-4">
            <ProgramStudiFields value={editForm} onChange={setEditForm} />
            {editError && <p className="text-sm text-destructive">{editError}</p>}
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
