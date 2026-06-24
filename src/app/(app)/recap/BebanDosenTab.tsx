"use client";

import { useEffect, useState } from "react";

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

export default function BebanDosenTab({
  programStudi,
  kelompokKeahlian,
}: {
  programStudi: ProgramStudi[];
  kelompokKeahlian: KelompokKeahlian[];
}) {
  const [kkId, setKkId] = useState("");
  const [homebaseProdiId, setHomebaseProdiId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (kkId) params.set("kkId", kkId);
      if (homebaseProdiId) params.set("homebaseProdiId", homebaseProdiId);
      const res = await fetch(`/api/recap/beban-dosen?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setRows(data.dosen);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kkId, homebaseProdiId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">KK</label>
          <select
            value={kkId}
            onChange={(e) => setKkId(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {kelompokKeahlian.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Homebase Prodi</label>
          <select
            value={homebaseProdiId}
            onChange={(e) => setHomebaseProdiId(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {programStudi.map((p) => (
              <option key={p.id} value={p.id}>
                {p.kode}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Kode</th>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">JFA</th>
              <th className="px-3 py-2">KK</th>
              <th className="px-3 py-2">Homebase</th>
              <th className="px-3 py-2">Beban Struktural</th>
              <th className="px-3 py-2">Total SKS</th>
              <th className="px-3 py-2">Kelas</th>
              <th className="px-3 py-2">MK</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-4 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{r.kode}</td>
                  <td className="px-3 py-2">{r.nama}</td>
                  <td className="px-3 py-2">{r.jfa ?? "—"}</td>
                  <td className="px-3 py-2">{r.kk ?? "—"}</td>
                  <td className="px-3 py-2">{r.homebaseProdi ?? "—"}</td>
                  <td className="px-3 py-2">{r.bebanStruktural ?? "—"}</td>
                  <td className="px-3 py-2">{r.totalSksPengajaran}</td>
                  <td className="px-3 py-2">{r.jumlahKelas}</td>
                  <td className="px-3 py-2">{r.jumlahMK}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
