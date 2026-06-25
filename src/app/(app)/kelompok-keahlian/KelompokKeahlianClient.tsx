"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Layers } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";

type Kk = {
  id: string;
  nama: string;
  kodeSingkat: string | null;
};

type FormState = { nama: string; kodeSingkat: string };
const EMPTY_FORM: FormState = { nama: "", kodeSingkat: "" };

function KkFields({
  value,
  onChange,
  idPrefix,
}: {
  value: FormState;
  onChange: (next: FormState) => void;
  idPrefix: string;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-nama`}>Nama</Label>
        <Input
          id={`${idPrefix}-nama`}
          required
          value={value.nama}
          onChange={(e) => onChange({ ...value, nama: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-kode`}>Kode singkat (optional)</Label>
        <Input
          id={`${idPrefix}-kode`}
          value={value.kodeSingkat}
          onChange={(e) => onChange({ ...value, kodeSingkat: e.target.value })}
        />
      </div>
    </>
  );
}

export default function KelompokKeahlianClient() {
  const [items, setItems] = useState<Kk[]>([]);
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
      const res = await fetch("/api/kelompok-keahlian");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setItems(data.kelompokKeahlian);
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
      const res = await fetch("/api/kelompok-keahlian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: createForm.nama,
          kodeSingkat: createForm.kodeSingkat || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to create");
      }
      setCreateForm(EMPTY_FORM);
      setCreateOpen(false);
      toast.success("Kelompok Keahlian created");
      await load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(k: Kk) {
    setEditingId(k.id);
    setEditForm({ nama: k.nama, kodeSingkat: k.kodeSingkat ?? "" });
    setEditError(null);
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/kelompok-keahlian/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: editForm.nama,
          kodeSingkat: editForm.kodeSingkat || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to update");
      }
      setEditingId(null);
      toast.success("Kelompok Keahlian updated");
      await load();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Kelompok Keahlian</CardTitle>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Add Kelompok Keahlian
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Kelompok Keahlian</DialogTitle>
            </DialogHeader>
            <form onSubmit={onCreate} className="space-y-4">
              <KkFields value={createForm} onChange={setCreateForm} idPrefix="create" />
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
              <TableHead className="sticky top-0 bg-card">Kode singkat</TableHead>
              <TableHead className="sticky top-0 bg-card text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton columns={3} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <EmptyState
                    icon={Layers}
                    title="No Kelompok Keahlian yet"
                    description="Create one to get started."
                  />
                </TableCell>
              </TableRow>
            ) : (
              items.map((k) => (
                <TableRow key={k.id} className="h-12">
                  <TableCell className="font-medium">{k.nama}</TableCell>
                  <TableCell>{k.kodeSingkat ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => startEdit(k)}>
                      Edit
                    </Button>
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
            <DialogTitle>Edit Kelompok Keahlian</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-4">
            <KkFields value={editForm} onChange={setEditForm} idPrefix="edit" />
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
