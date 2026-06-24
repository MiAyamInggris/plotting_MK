"use client";

import { useMemo, useState } from "react";

export type DosenOption = {
  id: string;
  kode: string;
  nama: string;
  kkId: string | null;
  aktif: boolean;
};

export default function DosenPicker({
  options,
  onSelect,
  onCancel,
}: {
  options: DosenOption[];
  onSelect: (dosenId: string) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = !q
      ? options
      : options.filter(
          (d) => d.kode.toLowerCase().includes(q) || d.nama.toLowerCase().includes(q),
        );
    return matches.slice(0, 25);
  }, [options, query]);

  return (
    <div className="absolute z-10 mt-1 w-72 rounded-md border border-slate-300 bg-white p-2 shadow-lg">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search kode or nama…"
        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
      />
      <ul className="mt-2 max-h-48 overflow-y-auto">
        {filtered.length === 0 && (
          <li className="px-2 py-1 text-sm text-slate-400">No matching dosen</li>
        )}
        {filtered.map((d) => (
          <li key={d.id}>
            <button
              onClick={() => onSelect(d.id)}
              className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-100"
            >
              <span className="font-medium">{d.kode}</span> — {d.nama}
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={onCancel}
        className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
      >
        Cancel
      </button>
    </div>
  );
}
