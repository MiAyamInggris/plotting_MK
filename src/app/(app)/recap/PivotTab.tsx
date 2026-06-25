"use client";

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Pivot = {
  dosen: {
    kode: string;
    nama: string;
    jfa: string | null;
    bebanStruktural: string | null;
    kk: string | null;
    homebaseProdi: string | null;
  };
  totalSks: number;
  jumlahKelas: number;
  jumlahMK: number;
  byProdi: {
    prodiKode: string;
    prodiNama: string;
    sks: number;
    kelas: {
      id: string;
      kodeMK: string;
      namaMK: string;
      kodeKelas: string;
      sks: number;
      semesterKe: number;
      tahunAngkatan: number;
    }[];
  }[];
};

export default function PivotTab() {
  const [kode, setKode] = useState("");
  const [pivot, setPivot] = useState<Pivot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    if (!kode.trim()) return;
    setLoading(true);
    setError(null);
    setPivot(null);
    try {
      const res = await fetch(`/api/recap/pivot?kode=${encodeURIComponent(kode.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Not found");
      setPivot(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <form onSubmit={onSearch} className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="pivot-kode" className="text-xs text-muted-foreground">
                Kode Dosen
              </Label>
              <Input
                id="pivot-kode"
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                placeholder="e.g. WPS"
                className="w-40 uppercase"
              />
            </div>
            <Button type="submit" disabled={loading}>
              <Search className="size-4" />
              {loading ? "Searching…" : "Search"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {pivot && (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {pivot.dosen.kode} — {pivot.dosen.nama}
              </p>
              <p className="text-xs text-muted-foreground">
                {pivot.dosen.jfa ?? "—"} · {pivot.dosen.kk ?? "—"} · Homebase{" "}
                {pivot.dosen.homebaseProdi ?? "—"}
                {pivot.dosen.bebanStruktural ? ` · Beban Struktural: ${pivot.dosen.bebanStruktural}` : ""}
              </p>
              <p className="pt-1 text-sm text-foreground">
                Total SKS: <span className="font-medium">{pivot.totalSks}</span> · Jumlah Kelas:{" "}
                <span className="font-medium">{pivot.jumlahKelas}</span> · Jumlah MK:{" "}
                <span className="font-medium">{pivot.jumlahMK}</span>
              </p>
            </CardContent>
          </Card>

          {pivot.byProdi.map((p) => (
            <Card key={p.prodiKode}>
              <CardHeader>
                <CardTitle className="text-base">
                  {p.prodiKode} — {p.prodiNama} ({p.sks} sks)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Kode MK</TableHead>
                      <TableHead>Nama MK</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead className="text-right">SKS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {p.kelas.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell>{k.kodeKelas}</TableCell>
                        <TableCell>{k.kodeMK}</TableCell>
                        <TableCell>{k.namaMK}</TableCell>
                        <TableCell>
                          {k.semesterKe} | {k.tahunAngkatan}
                        </TableCell>
                        <TableCell className="text-right">{k.sks}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
