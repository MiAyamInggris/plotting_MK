"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TableSkeleton } from "@/components/TableSkeleton";
import { useSemester } from "@/components/SemesterContext";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  kode: string;
  nama: string;
  kebutuhanSks: number | null;
  sudahDiampu: number;
  kekuranganSks: number | null;
  jumlahKelas: number;
};

function SummaryCard({ label, value, caption }: { label: string; value: number; caption: string }) {
  return (
    <Card>
      <CardContent className="space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{caption}</p>
      </CardContent>
    </Card>
  );
}

export default function ProdiSummaryTab({ canEditTargets }: { canEditTargets: boolean }) {
  const { semesterId } = useSemester();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!semesterId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/recap/prodi-summary?semesterPeriodeId=${semesterId}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setRows(data.prodiSummary);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesterId]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          kebutuhan: acc.kebutuhan + (r.kebutuhanSks ?? 0),
          sudahDiampu: acc.sudahDiampu + r.sudahDiampu,
          kekurangan: acc.kekurangan + (r.kekuranganSks ?? 0),
          kelas: acc.kelas + r.jumlahKelas,
        }),
        { kebutuhan: 0, sudahDiampu: 0, kekurangan: 0, kelas: 0 },
      ),
    [rows],
  );

  function startEdit(r: Row) {
    setEditingId(r.id);
    setEditValue(String(r.kebutuhanSks ?? ""));
    setEditError(null);
  }

  async function saveTarget(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch("/api/prodi-target", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prodiId: editingId,
          kebutuhanSks: Number(editValue),
          semesterPeriodeId: semesterId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to save");
      }
      setEditingId(null);
      toast.success("Target updated");
      await load();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Kebutuhan SKS"
          value={totals.kebutuhan}
          caption={`Across ${rows.length} Program Studi`}
        />
        <SummaryCard label="Total Sudah Diampu" value={totals.sudahDiampu} caption="SKS already taught" />
        <SummaryCard
          label="Total Kekurangan SKS"
          value={totals.kekurangan}
          caption={totals.kekurangan > 0 ? "Still needs staffing" : "Fully staffed"}
        />
        <SummaryCard label="Total Kelas" value={totals.kelas} caption="Sections offered" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Per-Prodi Summary</CardTitle>
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
                <TableHead className="sticky top-0 bg-card">Prodi</TableHead>
                <TableHead className="sticky top-0 bg-card text-right">Kebutuhan SKS</TableHead>
                <TableHead className="sticky top-0 bg-card text-right">Sudah Diampu</TableHead>
                <TableHead className="sticky top-0 bg-card text-right">Kekurangan SKS</TableHead>
                <TableHead className="sticky top-0 bg-card text-right">Jumlah Kelas</TableHead>
                {canEditTargets && (
                  <TableHead className="sticky top-0 bg-card text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton columns={canEditTargets ? 6 : 5} />
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id} className="h-12">
                    <TableCell className="font-medium">
                      {r.kode} — {r.nama}
                    </TableCell>
                    <TableCell className="text-right">{r.kebutuhanSks ?? "—"}</TableCell>
                    <TableCell className="text-right">{r.sudahDiampu}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          r.kekuranganSks != null && r.kekuranganSks > 0 && "text-amber-700 dark:text-amber-400",
                        )}
                      >
                        {r.kekuranganSks ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{r.jumlahKelas}</TableCell>
                    {canEditTargets && (
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => startEdit(r)}>
                          Set target
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Kebutuhan SKS target</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveTarget} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="target-value">Kebutuhan SKS</Label>
              <Input
                id="target-value"
                type="number"
                required
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
              />
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
