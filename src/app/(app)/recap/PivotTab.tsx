"use client";

import { useState, type FormEvent } from "react";

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
      <form onSubmit={onSearch} className="flex items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Kode Dosen</label>
          <input
            value={kode}
            onChange={(e) => setKode(e.target.value)}
            placeholder="e.g. WPS"
            className="w-40 rounded-md border border-slate-300 px-2 py-1.5 text-sm uppercase"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {pivot && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">
              {pivot.dosen.kode} — {pivot.dosen.nama}
            </p>
            <p className="text-xs text-slate-500">
              {pivot.dosen.jfa ?? "—"} · {pivot.dosen.kk ?? "—"} · Homebase{" "}
              {pivot.dosen.homebaseProdi ?? "—"}
              {pivot.dosen.bebanStruktural ? ` · Beban Struktural: ${pivot.dosen.bebanStruktural}` : ""}
            </p>
            <p className="mt-2 text-sm text-slate-700">
              Total SKS: <span className="font-medium">{pivot.totalSks}</span> · Jumlah Kelas:{" "}
              <span className="font-medium">{pivot.jumlahKelas}</span> · Jumlah MK:{" "}
              <span className="font-medium">{pivot.jumlahMK}</span>
            </p>
          </div>

          {pivot.byProdi.map((p) => (
            <div key={p.prodiKode} className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                {p.prodiKode} — {p.prodiNama} ({p.sks} sks)
              </h3>
              <table className="mt-2 w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-1">Kelas</th>
                    <th className="py-1">Kode MK</th>
                    <th className="py-1">Nama MK</th>
                    <th className="py-1">Semester</th>
                    <th className="py-1">SKS</th>
                  </tr>
                </thead>
                <tbody>
                  {p.kelas.map((k) => (
                    <tr key={k.id} className="border-t border-slate-100">
                      <td className="py-1">{k.kodeKelas}</td>
                      <td className="py-1">{k.kodeMK}</td>
                      <td className="py-1">{k.namaMK}</td>
                      <td className="py-1">
                        {k.semesterKe} | {k.tahunAngkatan}
                      </td>
                      <td className="py-1">{k.sks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
