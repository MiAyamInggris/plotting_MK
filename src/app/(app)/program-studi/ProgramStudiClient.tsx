"use client";

import { useEffect, useState, type FormEvent } from "react";

type Jenjang = "S1" | "D3";

type ProgramStudi = {
  id: string;
  kode: string;
  nama: string;
  jenjang: Jenjang;
  aktif: boolean;
};

export default function ProgramStudiClient() {
  const [items, setItems] = useState<ProgramStudi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [jenjang, setJenjang] = useState<Jenjang>("S1");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKode, setEditKode] = useState("");
  const [editNama, setEditNama] = useState("");
  const [editJenjang, setEditJenjang] = useState<Jenjang>("S1");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/program-studi");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setItems(data.programStudi);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
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
    setError(null);
    try {
      const res = await fetch("/api/program-studi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kode, nama, jenjang }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to create");
      }
      setKode("");
      setNama("");
      setJenjang("S1");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(p: ProgramStudi) {
    setEditingId(p.id);
    setEditKode(p.kode);
    setEditNama(p.nama);
    setEditJenjang(p.jenjang);
  }

  async function saveEdit(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/program-studi/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kode: editKode, nama: editNama, jenjang: editJenjang }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to update");
      }
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  }

  async function toggleActive(p: ProgramStudi) {
    setError(null);
    try {
      const res = await fetch(`/api/program-studi/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktif: !p.aktif }),
      });
      if (!res.ok) throw new Error("Failed to update");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={onCreate}
        className="grid max-w-2xl grid-cols-3 gap-4 rounded-lg border border-slate-200 bg-white p-4"
      >
        <h2 className="col-span-3 text-sm font-semibold text-slate-900">Create Program Studi</h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Kode</label>
          <input
            required
            value={kode}
            onChange={(e) => setKode(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nama</label>
          <input
            required
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Jenjang</label>
          <select
            value={jenjang}
            onChange={(e) => setJenjang(e.target.value as Jenjang)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="S1">S1</option>
            <option value="D3">D3</option>
          </select>
        </div>
        <div className="col-span-3">
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Kode</th>
              <th className="px-4 py-2">Nama</th>
              <th className="px-4 py-2">Jenjang</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    {editingId === p.id ? (
                      <input
                        value={editKode}
                        onChange={(e) => setEditKode(e.target.value)}
                        className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                    ) : (
                      p.kode
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editingId === p.id ? (
                      <input
                        value={editNama}
                        onChange={(e) => setEditNama(e.target.value)}
                        className="w-64 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                    ) : (
                      p.nama
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editingId === p.id ? (
                      <select
                        value={editJenjang}
                        onChange={(e) => setEditJenjang(e.target.value as Jenjang)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="S1">S1</option>
                        <option value="D3">D3</option>
                      </select>
                    ) : (
                      p.jenjang
                    )}
                  </td>
                  <td className="px-4 py-2">{p.aktif ? "Yes" : "No"}</td>
                  <td className="px-4 py-2">
                    {editingId === p.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(p.id)}
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
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(p)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActive(p)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                        >
                          {p.aktif ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
