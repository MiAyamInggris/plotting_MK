"use client";

import { useEffect, useState, type FormEvent } from "react";

type Role = "ADMIN" | "KAPRODI" | "KETUA_KK";

type Kelas = {
  id: string;
  kodeKelas: string;
  sectionSuffix: string;
  sks: number;
  dosenId: string | null;
};

type CourseOffering = {
  id: string;
  semesterKe: number;
  tahunAngkatan: number;
  kelasPrefix: string;
  kelas: Kelas[];
};

type MataKuliah = {
  id: string;
  kodeMK: string;
  nama: string;
  sks: number;
  ket: string | null;
  prodiId: string;
  prodi: { kode: string; nama: string };
  courseOfferings: CourseOffering[];
};

type ProgramStudi = { id: string; kode: string; nama: string };

export default function MataKuliahClient({
  role,
  userProdiId,
  programStudi,
}: {
  role: Role;
  userProdiId: string | null;
  programStudi: ProgramStudi[];
}) {
  const isKaprodi = role === "KAPRODI";
  const [selectedProdiId, setSelectedProdiId] = useState(
    isKaprodi ? userProdiId ?? "" : programStudi[0]?.id ?? "",
  );

  const [items, setItems] = useState<MataKuliah[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [kodeMK, setKodeMK] = useState("");
  const [nama, setNama] = useState("");
  const [sks, setSks] = useState("");
  const [ket, setKet] = useState("");
  const [creating, setCreating] = useState(false);

  const [offeringForms, setOfferingForms] = useState<
    Record<string, { semesterKe: string; tahunAngkatan: string; kelasPrefix: string }>
  >({});

  async function load() {
    if (!selectedProdiId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/mata-kuliah?prodiId=${selectedProdiId}`);
      if (!res.ok) throw new Error("Failed to load mata kuliah");
      const data = await res.json();
      setItems(data.mataKuliah);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load mata kuliah");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProdiId]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/mata-kuliah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kodeMK,
          nama,
          sks: Number(sks),
          prodiId: selectedProdiId,
          ket: ket || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to create");
      }
      setKodeMK("");
      setNama("");
      setSks("");
      setKet("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  async function deleteMataKuliah(id: string) {
    if (!window.confirm("Delete this Mata Kuliah? This cannot be undone.")) return;
    setError(null);
    try {
      const res = await fetch(`/api/mata-kuliah/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to delete");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  function offeringForm(mkId: string) {
    return offeringForms[mkId] ?? { semesterKe: "", tahunAngkatan: "", kelasPrefix: "" };
  }

  async function onCreateOffering(mkId: string, e: FormEvent) {
    e.preventDefault();
    setError(null);
    const form = offeringForm(mkId);
    try {
      const res = await fetch("/api/course-offerings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mataKuliahId: mkId,
          semesterKe: Number(form.semesterKe),
          tahunAngkatan: Number(form.tahunAngkatan),
          kelasPrefix: form.kelasPrefix,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to create offering");
      }
      setOfferingForms((prev) => ({
        ...prev,
        [mkId]: { semesterKe: "", tahunAngkatan: "", kelasPrefix: "" },
      }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create offering");
    }
  }

  async function deleteOffering(id: string) {
    if (!window.confirm("Remove this offering? This cannot be undone.")) return;
    setError(null);
    try {
      const res = await fetch(`/api/course-offerings/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to delete offering");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete offering");
    }
  }

  return (
    <div className="space-y-6">
      {!isKaprodi && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <label className="mb-1 block text-xs font-medium text-slate-600">Program Studi</label>
          <select
            value={selectedProdiId}
            onChange={(e) => setSelectedProdiId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {programStudi.map((p) => (
              <option key={p.id} value={p.id}>
                {p.kode} — {p.nama}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedProdiId && (
        <form
          onSubmit={onCreate}
          className="grid grid-cols-4 gap-4 rounded-lg border border-slate-200 bg-white p-4"
        >
          <h2 className="col-span-4 text-sm font-semibold text-slate-900">Create Mata Kuliah</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Kode MK</label>
            <input
              required
              value={kodeMK}
              onChange={(e) => setKodeMK(e.target.value)}
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
            <label className="mb-1 block text-sm font-medium text-slate-700">SKS</label>
            <input
              required
              type="number"
              step="0.5"
              min="0"
              value={sks}
              onChange={(e) => setSks(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ket</label>
            <input
              value={ket}
              onChange={(e) => setKet(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-4">
            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">No mata kuliah found for this prodi.</p>
        ) : (
          items.map((mk) => {
            const expanded = expandedId === mk.id;
            const form = offeringForm(mk.id);
            return (
              <div key={mk.id} className="rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between px-4 py-3">
                  <button
                    onClick={() => setExpandedId(expanded ? null : mk.id)}
                    className="flex-1 text-left"
                  >
                    <span className="font-medium text-slate-900">{mk.kodeMK}</span>{" "}
                    <span className="text-slate-700">{mk.nama}</span>{" "}
                    <span className="text-slate-500">
                      ({mk.sks} sks{mk.ket ? `, ${mk.ket}` : ""}) — {mk.courseOfferings.length}{" "}
                      offering(s)
                    </span>
                  </button>
                  <button
                    onClick={() => deleteMataKuliah(mk.id)}
                    className="ml-4 rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>

                {expanded && (
                  <div className="border-t border-slate-100 px-4 py-3">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs uppercase text-slate-500">
                        <tr>
                          <th className="py-1">Semester</th>
                          <th className="py-1">Angkatan</th>
                          <th className="py-1">Prefix</th>
                          <th className="py-1">Sections</th>
                          <th className="py-1">Total SKS plotted</th>
                          <th className="py-1"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {mk.courseOfferings.map((co) => (
                          <tr key={co.id} className="border-t border-slate-100">
                            <td className="py-1">{co.semesterKe}</td>
                            <td className="py-1">{co.tahunAngkatan}</td>
                            <td className="py-1">{co.kelasPrefix}</td>
                            <td className="py-1">{co.kelas.length}</td>
                            <td className="py-1">
                              {co.kelas.reduce((sum, k) => sum + (k.dosenId ? k.sks : 0), 0)}
                            </td>
                            <td className="py-1 text-right">
                              <button
                                onClick={() => deleteOffering(co.id)}
                                className="rounded-md border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <form
                      onSubmit={(e) => onCreateOffering(mk.id, e)}
                      className="mt-3 flex flex-wrap items-end gap-3"
                    >
                      <div>
                        <label className="mb-1 block text-xs text-slate-600">Semester ke</label>
                        <input
                          required
                          type="number"
                          value={form.semesterKe}
                          onChange={(e) =>
                            setOfferingForms((prev) => ({
                              ...prev,
                              [mk.id]: { ...form, semesterKe: e.target.value },
                            }))
                          }
                          className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-600">Tahun angkatan</label>
                        <input
                          required
                          type="number"
                          value={form.tahunAngkatan}
                          onChange={(e) =>
                            setOfferingForms((prev) => ({
                              ...prev,
                              [mk.id]: { ...form, tahunAngkatan: e.target.value },
                            }))
                          }
                          className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-600">Kelas prefix</label>
                        <input
                          required
                          placeholder="S1IF-10-"
                          value={form.kelasPrefix}
                          onChange={(e) =>
                            setOfferingForms((prev) => ({
                              ...prev,
                              [mk.id]: { ...form, kelasPrefix: e.target.value },
                            }))
                          }
                          className="w-40 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <button
                        type="submit"
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
                      >
                        Add offering
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
