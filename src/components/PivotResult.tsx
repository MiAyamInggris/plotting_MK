import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type Pivot = {
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

export function PivotResult({ pivot }: { pivot: Pivot }) {
  return (
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
  );
}
