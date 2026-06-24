"use client";

import { useEffect, useState } from "react";

type Row = {
  id: string;
  kode: string;
  nama: string;
  kebutuhanSks: number | null;
  sudahDiampu: number;
  kekuranganSks: number | null;
  jumlahKelas: number;
};

export default function ProdiSummaryTab({ canEditTargets }: { canEditTargets: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recap/prodi-summary");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setRows(data.prodiSummary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveTarget(prodiId: string) {
    setError(null);
    try {
      const res = await fetch("/api/prodi-target", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prodiId, kebutuhanSks: Number(editValue) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to save");
      }
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Prodi</th>
              <th className="px-3 py-2">Kebutuhan SKS</th>
              <th className="px-3 py-2">Sudah Diampu</th>
              <th className="px-3 py-2">Kekurangan SKS</th>
              <th className="px-3 py-2">Jumlah Kelas</th>
              {canEditTargets && <th className="px-3 py-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">
                    {r.kode} — {r.nama}
                  </td>
                  <td className="px-3 py-2">
                    {editingId === r.id ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                    ) : (
                      r.kebutuhanSks ?? "—"
                    )}
                  </td>
                  <td className="px-3 py-2">{r.sudahDiampu}</td>
                  <td className="px-3 py-2">
                    <span className={r.kekuranganSks != null && r.kekuranganSks > 0 ? "text-amber-700" : ""}>
                      {r.kekuranganSks ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2">{r.jumlahKelas}</td>
                  {canEditTargets && (
                    <td className="px-3 py-2">
                      {editingId === r.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveTarget(r.id)}
                            className="rounded-md bg-slate-900 px-2 py-1 text-xs text-white"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(r.id);
                            setEditValue(String(r.kebutuhanSks ?? ""));
                          }}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                        >
                          Set target
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
