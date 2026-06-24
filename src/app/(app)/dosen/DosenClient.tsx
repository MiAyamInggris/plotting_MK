"use client";

import { Fragment, useEffect, useMemo, useState, type FormEvent } from "react";

type TingkatPendidikan = "S2" | "S3" | "ON_GOING_S3";

type Dosen = {
  id: string;
  kode: string;
  nama: string;
  namaTanpaGelar: string;
  nipYpt: string | null;
  nidn: string | null;
  jfa: string | null;
  tmtJfa: string | null;
  homebaseProdiId: string | null;
  tingkatPendidikan: TingkatPendidikan | null;
  kkId: string | null;
  coeId: string | null;
  bebanStruktural: string | null;
  aktif: boolean;
  homebaseProdi: { kode: string; nama: string } | null;
  kk: { nama: string } | null;
  coe: { nama: string } | null;
};

type ProgramStudi = { id: string; kode: string; nama: string };
type KelompokKeahlian = { id: string; nama: string };
type Coe = { id: string; nama: string };

const JFA_OPTIONS = [
  "Asisten Ahli (150)",
  "Lektor (200)",
  "Lektor (300)",
  "Lektor Kepala (400)",
  "Lektor Kepala (550)",
  "NJFA",
];

const TINGKAT_OPTIONS: TingkatPendidikan[] = ["S2", "S3", "ON_GOING_S3"];

type FormState = {
  kode: string;
  nama: string;
  namaTanpaGelar: string;
  nipYpt: string;
  nidn: string;
  jfa: string;
  tmtJfa: string;
  homebaseProdiId: string;
  tingkatPendidikan: string;
  kkId: string;
  coeId: string;
  bebanStruktural: string;
};

const EMPTY_FORM: FormState = {
  kode: "",
  nama: "",
  namaTanpaGelar: "",
  nipYpt: "",
  nidn: "",
  jfa: "",
  tmtJfa: "",
  homebaseProdiId: "",
  tingkatPendidikan: "",
  kkId: "",
  coeId: "",
  bebanStruktural: "",
};

function toPayload(f: FormState) {
  return {
    kode: f.kode,
    nama: f.nama,
    namaTanpaGelar: f.namaTanpaGelar,
    nipYpt: f.nipYpt || null,
    nidn: f.nidn || null,
    jfa: f.jfa || null,
    tmtJfa: f.tmtJfa || null,
    homebaseProdiId: f.homebaseProdiId || null,
    tingkatPendidikan: f.tingkatPendidikan || null,
    kkId: f.kkId || null,
    coeId: f.coeId || null,
    bebanStruktural: f.bebanStruktural || null,
  };
}

function DosenFields({
  value,
  onChange,
  programStudi,
  kelompokKeahlian,
  coeList,
}: {
  value: FormState;
  onChange: (next: FormState) => void;
  programStudi: ProgramStudi[];
  kelompokKeahlian: KelompokKeahlian[];
  coeList: Coe[];
}) {
  function set<K extends keyof FormState>(key: K, v: string) {
    onChange({ ...value, [key]: v });
  }

  return (
    <>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Kode</label>
        <input
          required
          maxLength={10}
          value={value.kode}
          onChange={(e) => set("kode", e.target.value.toUpperCase())}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Nama</label>
        <input
          required
          value={value.nama}
          onChange={(e) => set("nama", e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Nama tanpa gelar
        </label>
        <input
          required
          value={value.namaTanpaGelar}
          onChange={(e) => set("namaTanpaGelar", e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">NIP YPT</label>
        <input
          value={value.nipYpt}
          onChange={(e) => set("nipYpt", e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">NIDN/NUPTK</label>
        <input
          value={value.nidn}
          onChange={(e) => set("nidn", e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">JFA</label>
        <select
          value={value.jfa}
          onChange={(e) => set("jfa", e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">—</option>
          {JFA_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">TMT JFA</label>
        <input
          type="date"
          value={value.tmtJfa}
          onChange={(e) => set("tmtJfa", e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Homebase Prodi</label>
        <select
          value={value.homebaseProdiId}
          onChange={(e) => set("homebaseProdiId", e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">—</option>
          {programStudi.map((p) => (
            <option key={p.id} value={p.id}>
              {p.kode} — {p.nama}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Tingkat Pendidikan
        </label>
        <select
          value={value.tingkatPendidikan}
          onChange={(e) => set("tingkatPendidikan", e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">—</option>
          {TINGKAT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Kelompok Keahlian
        </label>
        <select
          value={value.kkId}
          onChange={(e) => set("kkId", e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">—</option>
          {kelompokKeahlian.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">COE</label>
        <select
          value={value.coeId}
          onChange={(e) => set("coeId", e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">—</option>
          {coeList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nama}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Beban Struktural
        </label>
        <input
          value={value.bebanStruktural}
          onChange={(e) => set("bebanStruktural", e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
    </>
  );
}

export default function DosenClient({ canEdit }: { canEdit: boolean }) {
  const [items, setItems] = useState<Dosen[]>([]);
  const [programStudi, setProgramStudi] = useState<ProgramStudi[]>([]);
  const [kelompokKeahlian, setKelompokKeahlian] = useState<KelompokKeahlian[]>([]);
  const [coeList, setCoeList] = useState<Coe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterKkId, setFilterKkId] = useState("");
  const [filterProdiId, setFilterProdiId] = useState("");
  const [filterJfa, setFilterJfa] = useState("");
  const [filterCoeId, setFilterCoeId] = useState("");
  const [filterTingkat, setFilterTingkat] = useState("");
  const [filterAktif, setFilterAktif] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterKkId) params.set("kkId", filterKkId);
    if (filterProdiId) params.set("homebaseProdiId", filterProdiId);
    if (filterJfa) params.set("jfa", filterJfa);
    if (filterCoeId) params.set("coeId", filterCoeId);
    if (filterTingkat) params.set("tingkatPendidikan", filterTingkat);
    if (filterAktif) params.set("aktif", filterAktif);
    return params.toString();
  }, [search, filterKkId, filterProdiId, filterJfa, filterCoeId, filterTingkat, filterAktif]);

  async function loadDosen() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dosen${query ? `?${query}` : ""}`);
      if (!res.ok) throw new Error("Failed to load dosen");
      const data = await res.json();
      setItems(data.dosen);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dosen");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadDosen, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    async function loadLookups() {
      const [prodiRes, kkRes, coeRes] = await Promise.all([
        fetch("/api/program-studi"),
        fetch("/api/kelompok-keahlian"),
        fetch("/api/coe"),
      ]);
      setProgramStudi((await prodiRes.json()).programStudi);
      setKelompokKeahlian((await kkRes.json()).kelompokKeahlian);
      setCoeList((await coeRes.json()).coe);
    }
    loadLookups();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/dosen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(createForm)),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to create");
      }
      setCreateForm(EMPTY_FORM);
      setShowCreate(false);
      await loadDosen();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(d: Dosen) {
    setEditingId(d.id);
    setEditForm({
      kode: d.kode,
      nama: d.nama,
      namaTanpaGelar: d.namaTanpaGelar,
      nipYpt: d.nipYpt ?? "",
      nidn: d.nidn ?? "",
      jfa: d.jfa ?? "",
      tmtJfa: d.tmtJfa ? d.tmtJfa.slice(0, 10) : "",
      homebaseProdiId: d.homebaseProdiId ?? "",
      tingkatPendidikan: d.tingkatPendidikan ?? "",
      kkId: d.kkId ?? "",
      coeId: d.coeId ?? "",
      bebanStruktural: d.bebanStruktural ?? "",
    });
  }

  async function saveEdit(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/dosen/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(editForm)),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to update");
      }
      setEditingId(null);
      await loadDosen();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  }

  async function toggleActive(d: Dosen) {
    setError(null);
    try {
      const res = await fetch(`/api/dosen/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktif: !d.aktif }),
      });
      if (!res.ok) throw new Error("Failed to update");
      await loadDosen();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="kode or nama"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">KK</label>
          <select
            value={filterKkId}
            onChange={(e) => setFilterKkId(e.target.value)}
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
          <label className="mb-1 block text-xs font-medium text-slate-600">Homebase</label>
          <select
            value={filterProdiId}
            onChange={(e) => setFilterProdiId(e.target.value)}
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
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">JFA</label>
          <select
            value={filterJfa}
            onChange={(e) => setFilterJfa(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {JFA_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">COE</label>
          <select
            value={filterCoeId}
            onChange={(e) => setFilterCoeId(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {coeList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nama}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Pendidikan</label>
          <select
            value={filterTingkat}
            onChange={(e) => setFilterTingkat(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {TINGKAT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Active</label>
          <select
            value={filterAktif}
            onChange={(e) => setFilterAktif(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="ml-auto rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {showCreate ? "Close" : "+ New Dosen"}
          </button>
        )}
      </div>

      {showCreate && canEdit && (
        <form
          onSubmit={onCreate}
          className="grid grid-cols-3 gap-4 rounded-lg border border-slate-200 bg-white p-4"
        >
          <h2 className="col-span-3 text-sm font-semibold text-slate-900">Create Dosen</h2>
          <DosenFields
            value={createForm}
            onChange={setCreateForm}
            programStudi={programStudi}
            kelompokKeahlian={kelompokKeahlian}
            coeList={coeList}
          />
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
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Kode</th>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">NIP/NIDN</th>
              <th className="px-3 py-2">JFA</th>
              <th className="px-3 py-2">Homebase</th>
              <th className="px-3 py-2">Pendidikan</th>
              <th className="px-3 py-2">KK</th>
              <th className="px-3 py-2">COE</th>
              <th className="px-3 py-2">Beban Struktural</th>
              <th className="px-3 py-2">Active</th>
              {canEdit && <th className="px-3 py-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={canEdit ? 11 : 10} className="px-4 py-4 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 11 : 10} className="px-4 py-4 text-center text-slate-500">
                  No dosen found.
                </td>
              </tr>
            ) : (
              items.map((d) => (
                <Fragment key={d.id}>
                  <tr className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium">{d.kode}</td>
                    <td className="px-3 py-2">{d.nama}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {d.nipYpt ?? "—"} / {d.nidn ?? "—"}
                    </td>
                    <td className="px-3 py-2">{d.jfa ?? "—"}</td>
                    <td className="px-3 py-2">{d.homebaseProdi?.kode ?? "—"}</td>
                    <td className="px-3 py-2">{d.tingkatPendidikan ?? "—"}</td>
                    <td className="px-3 py-2">{d.kk?.nama ?? "—"}</td>
                    <td className="px-3 py-2">{d.coe?.nama ?? "—"}</td>
                    <td className="px-3 py-2">{d.bebanStruktural ?? "—"}</td>
                    <td className="px-3 py-2">{d.aktif ? "Yes" : "No"}</td>
                    {canEdit && (
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              editingId === d.id ? setEditingId(null) : startEdit(d)
                            }
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                          >
                            {editingId === d.id ? "Close" : "Edit"}
                          </button>
                          <button
                            onClick={() => toggleActive(d)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                          >
                            {d.aktif ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                  {editingId === d.id && canEdit && (
                    <tr className="border-t border-slate-100 bg-slate-50">
                      <td colSpan={11} className="px-4 py-4">
                        <div className="grid grid-cols-3 gap-4">
                          <DosenFields
                            value={editForm}
                            onChange={setEditForm}
                            programStudi={programStudi}
                            kelompokKeahlian={kelompokKeahlian}
                            coeList={coeList}
                          />
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => saveEdit(d.id)}
                            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
