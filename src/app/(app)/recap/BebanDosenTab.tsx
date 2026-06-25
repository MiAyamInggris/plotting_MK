"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

type ProgramStudi = { id: string; kode: string; nama: string };
type KelompokKeahlian = { id: string; nama: string };

type Row = {
  id: string;
  kode: string;
  nama: string;
  jfa: string | null;
  bebanStruktural: string | null;
  kk: string | null;
  homebaseProdi: string | null;
  totalSksPengajaran: number;
  jumlahKelas: number;
  jumlahMK: number;
  sksPerProdi: Record<string, number>;
};

const ALL = "__all__";

export default function BebanDosenTab({
  programStudi,
  kelompokKeahlian,
}: {
  programStudi: ProgramStudi[];
  kelompokKeahlian: KelompokKeahlian[];
}) {
  const [kkId, setKkId] = useState(ALL);
  const [homebaseProdiId, setHomebaseProdiId] = useState(ALL);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (kkId !== ALL) params.set("kkId", kkId);
      if (homebaseProdiId !== ALL) params.set("homebaseProdiId", homebaseProdiId);
      const res = await fetch(`/api/recap/beban-dosen?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setRows(data.dosen);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kkId, homebaseProdiId]);

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">KK</Label>
            <Select value={kkId} onValueChange={setKkId}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {kelompokKeahlian.map((k) => (
                  <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Homebase Prodi</Label>
            <Select value={homebaseProdiId} onValueChange={setHomebaseProdiId}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {programStudi.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.kode}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

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
              <TableHead className="sticky top-0 bg-card">JFA</TableHead>
              <TableHead className="sticky top-0 bg-card">KK</TableHead>
              <TableHead className="sticky top-0 bg-card">Homebase</TableHead>
              <TableHead className="sticky top-0 bg-card">Beban Struktural</TableHead>
              <TableHead className="sticky top-0 bg-card text-right">Total SKS</TableHead>
              <TableHead className="sticky top-0 bg-card text-right">Kelas</TableHead>
              <TableHead className="sticky top-0 bg-card text-right">MK</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton columns={9} />
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState icon={Users} title="No dosen found" />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} className="h-12">
                  <TableCell className="font-medium">{r.kode}</TableCell>
                  <TableCell>{r.nama}</TableCell>
                  <TableCell>{r.jfa ?? "—"}</TableCell>
                  <TableCell>{r.kk ?? "—"}</TableCell>
                  <TableCell>{r.homebaseProdi ?? "—"}</TableCell>
                  <TableCell>{r.bebanStruktural ?? "—"}</TableCell>
                  <TableCell className="text-right">{r.totalSksPengajaran}</TableCell>
                  <TableCell className="text-right">{r.jumlahKelas}</TableCell>
                  <TableCell className="text-right">{r.jumlahMK}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
