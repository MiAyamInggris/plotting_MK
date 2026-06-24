"use client";

import { useEffect, useState, type FormEvent } from "react";

type Kk = {
  id: string;
  nama: string;
  kodeSingkat: string | null;
};

export default function KelompokKeahlianClient() {
  const [items, setItems] = useState<Kk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nama, setNama] = useState("");
  const [kodeSingkat, setKodeSingkat] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editKodeSingkat, setEditKodeSingkat] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/kelompok-keahlian");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setItems(data.kelompokKeahlian);
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
      const res = await fetch("/api/kelompok-keahlian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, kodeSingkat: kodeSingkat || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to create");
      }
      setNama("");
      setKodeSingkat("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(k: Kk) {
    setEditingId(k.id);
    setEditNama(k.nama);
    setEditKodeSingkat(k.kodeSingkat ?? "");
  }

  async function saveEdit(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/kelompok-keahlian/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: editNama, kodeSingkat: editKodeSingkat || null }),
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

  return (
    <div className="space-y-8">
      <form
        onSubmit={onCreate}
        className="grid max-w-2xl grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4"
      >
        <h2 className="col-span-2 text-sm font-semibold text-slate-900">
          Create Kelompok Keahlian
        </h2>
        <div className="col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Nama</label>
          <input
            required
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Kode singkat (optional)
          </label>
          <input
            value={kodeSingkat}
            onChange={(e) => setKodeSingkat(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="col-span-2">
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
              <th className="px-4 py-2">Nama</th>
              <th className="px-4 py-2">Kode singkat</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : (
              items.map((k) => (
                <tr key={k.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    {editingId === k.id ? (
                      <input
                        value={editNama}
                        onChange={(e) => setEditNama(e.target.value)}
                        className="w-96 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                    ) : (
                      k.nama
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editingId === k.id ? (
                      <input
                        value={editKodeSingkat}
                        onChange={(e) => setEditKodeSingkat(e.target.value)}
                        className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                    ) : (
                      k.kodeSingkat ?? "—"
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editingId === k.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(k.id)}
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
                        onClick={() => startEdit(k)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                      >
                        Edit
                      </button>
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
