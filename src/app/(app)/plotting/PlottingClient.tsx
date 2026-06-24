"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import DosenPicker, { type DosenOption } from "./DosenPicker";

type Dosen = { id: string; kode: string; nama: string; kkId: string | null; aktif: boolean };
type Kelas = {
  id: string;
  kodeKelas: string;
  sectionSuffix: string;
  sks: number;
  dosenId: string | null;
  dosen: Dosen | null;
};
type CourseOffering = {
  id: string;
  semesterKe: number;
  tahunAngkatan: number;
  kelasPrefix: string;
  kelas: Kelas[];
};
type MataKuliahRow = {
  id: string;
  kodeMK: string;
  nama: string;
  sks: number;
  ket: string | null;
  courseOfferings: CourseOffering[];
};
type ProgramStudi = { id: string; kode: string; nama: string };
type RuleWarning = { level: "error" | "warning"; code: string; message: string };

function SectionBadge({
  kelas,
  canEdit,
  canManageSections,
  dosenOptions,
  editing,
  onStartEdit,
  onCancelEdit,
  onAssign,
  onClear,
  onRemove,
  saving,
}: {
  kelas: Kelas;
  canEdit: boolean;
  canManageSections: boolean;
  dosenOptions: DosenOption[];
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onAssign: (dosenId: string) => void;
  onClear: () => void;
  onRemove: () => void;
  saving: boolean;
}) {
  return (
    <div className="relative flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs">
      <span className="font-mono text-slate-500">{kelas.sectionSuffix}</span>
      <span className={kelas.dosen ? "text-slate-900" : "italic text-slate-400"}>
        {kelas.dosen ? `${kelas.dosen.kode} — ${kelas.dosen.nama}` : "unassigned"}
      </span>
      <span className="text-slate-400">({kelas.sks} sks)</span>

      {canEdit && (
        <>
          <button
            onClick={onStartEdit}
            disabled={saving}
            className="ml-1 rounded border border-slate-300 px-1.5 py-0.5 hover:bg-slate-100 disabled:opacity-50"
          >
            {saving ? "…" : "Change"}
          </button>
          {kelas.dosen && (
            <button
              onClick={onClear}
              disabled={saving}
              className="rounded border border-slate-300 px-1.5 py-0.5 hover:bg-slate-100 disabled:opacity-50"
            >
              Clear
            </button>
          )}
        </>
      )}
      {canManageSections && (
        <button
          onClick={onRemove}
          disabled={saving}
          className="rounded border border-red-200 px-1.5 py-0.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          ✕
        </button>
      )}

      {editing && (
        <DosenPicker options={dosenOptions} onSelect={onAssign} onCancel={onCancelEdit} />
      )}
    </div>
  );
}

export default function PlottingClient({
  programStudi,
  defaultProdiId,
  canEdit,
  canManageSections,
  dosenOptions,
}: {
  programStudi: ProgramStudi[];
  defaultProdiId: string | null;
  canEdit: boolean;
  canManageSections: boolean;
  dosenOptions: DosenOption[];
}) {
  const [selectedProdiId, setSelectedProdiId] = useState(
    defaultProdiId ?? programStudi[0]?.id ?? "",
  );
  const [mataKuliah, setMataKuliah] = useState<MataKuliahRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingKelasId, setEditingKelasId] = useState<string | null>(null);
  const [savingKelasId, setSavingKelasId] = useState<string | null>(null);
  const [warningsByKelas, setWarningsByKelas] = useState<Record<string, RuleWarning[]>>({});
  const [sectionForms, setSectionForms] = useState<Record<string, string>>({});

  async function load() {
    if (!selectedProdiId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/plotting?prodiId=${selectedProdiId}`);
      if (!res.ok) throw new Error("Failed to load plotting data");
      const data = await res.json();
      setMataKuliah(data.mataKuliah);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load plotting data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProdiId]);

  const blocks = useMemo(() => {
    const map = new Map<
      string,
      { semesterKe: number; tahunAngkatan: number; rows: { mk: MataKuliahRow; co: CourseOffering }[] }
    >();
    for (const mk of mataKuliah) {
      for (const co of mk.courseOfferings) {
        const key = `${co.semesterKe}|${co.tahunAngkatan}`;
        if (!map.has(key)) {
          map.set(key, { semesterKe: co.semesterKe, tahunAngkatan: co.tahunAngkatan, rows: [] });
        }
        map.get(key)!.rows.push({ mk, co });
      }
    }
    return [...map.values()].sort(
      (a, b) => b.tahunAngkatan - a.tahunAngkatan || a.semesterKe - b.semesterKe,
    );
  }, [mataKuliah]);

  async function assignDosen(kelasId: string, dosenId: string) {
    setSavingKelasId(kelasId);
    setEditingKelasId(null);
    setError(null);
    try {
      const res = await fetch(`/api/plotting/kelas/${kelasId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dosenId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed to assign");
      setWarningsByKelas((prev) => ({ ...prev, [kelasId]: data.warnings ?? [] }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign dosen");
    } finally {
      setSavingKelasId(null);
    }
  }

  async function clearDosen(kelasId: string) {
    setSavingKelasId(kelasId);
    setError(null);
    try {
      const res = await fetch(`/api/plotting/kelas/${kelasId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dosenId: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed to clear");
      setWarningsByKelas((prev) => ({ ...prev, [kelasId]: [] }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to clear dosen");
    } finally {
      setSavingKelasId(null);
    }
  }

  async function removeSection(kelasId: string) {
    if (!window.confirm("Remove this section? This cannot be undone.")) return;
    setSavingKelasId(kelasId);
    setError(null);
    try {
      const res = await fetch(`/api/plotting/kelas/${kelasId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to remove section");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove section");
    } finally {
      setSavingKelasId(null);
    }
  }

  async function addSection(courseOfferingId: string, e: FormEvent) {
    e.preventDefault();
    const suffix = sectionForms[courseOfferingId]?.trim();
    if (!suffix) return;
    setError(null);
    try {
      const res = await fetch("/api/plotting/kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseOfferingId, sectionSuffix: suffix }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to add section");
      }
      setSectionForms((prev) => ({ ...prev, [courseOfferingId]: "" }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add section");
    }
  }

  const allWarnings = Object.values(warningsByKelas).flat();

  return (
    <div className="space-y-6">
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

      {error && <p className="text-sm text-red-600">{error}</p>}
      {allWarnings.length > 0 && (
        <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {allWarnings.map((w, i) => (
            <p key={i}>⚠ {w.message}</p>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : blocks.length === 0 ? (
        <p className="text-sm text-slate-500">No courses found for this prodi in the active period.</p>
      ) : (
        blocks.map((block) => (
          <div key={`${block.semesterKe}-${block.tahunAngkatan}`} className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Semester {block.semesterKe} | Tahun Angkatan {block.tahunAngkatan}
            </h2>
            <div className="space-y-2">
              {block.rows
                .sort((a, b) => a.mk.kodeMK.localeCompare(b.mk.kodeMK))
                .map(({ mk, co }) => (
                  <div key={co.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-slate-900">{mk.kodeMK}</span>
                      <span className="text-slate-700">{mk.nama}</span>
                      <span className="text-xs text-slate-500">
                        ({mk.sks} sks{mk.ket ? `, ${mk.ket}` : ""})
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {co.kelas.map((k) => (
                        <SectionBadge
                          key={k.id}
                          kelas={k}
                          canEdit={canEdit}
                          canManageSections={canManageSections}
                          dosenOptions={dosenOptions}
                          editing={editingKelasId === k.id}
                          onStartEdit={() => setEditingKelasId(k.id)}
                          onCancelEdit={() => setEditingKelasId(null)}
                          onAssign={(dosenId) => assignDosen(k.id, dosenId)}
                          onClear={() => clearDosen(k.id)}
                          onRemove={() => removeSection(k.id)}
                          saving={savingKelasId === k.id}
                        />
                      ))}
                    </div>
                    {canManageSections && (
                      <form
                        onSubmit={(e) => addSection(co.id, e)}
                        className="mt-2 flex items-center gap-2"
                      >
                        <input
                          placeholder="new suffix, e.g. 09"
                          value={sectionForms[co.id] ?? ""}
                          onChange={(e) =>
                            setSectionForms((prev) => ({ ...prev, [co.id]: e.target.value }))
                          }
                          className="w-32 rounded-md border border-slate-300 px-2 py-1 text-xs"
                        />
                        <button
                          type="submit"
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                        >
                          + Add section
                        </button>
                      </form>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
