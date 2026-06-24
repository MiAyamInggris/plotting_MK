"use client";

import { useState } from "react";
import BebanDosenTab from "./BebanDosenTab";
import ProdiSummaryTab from "./ProdiSummaryTab";
import PivotTab from "./PivotTab";

type ProgramStudi = { id: string; kode: string; nama: string };
type KelompokKeahlian = { id: string; nama: string };

type Tab = "beban-dosen" | "prodi-summary" | "pivot";

const TABS: { id: Tab; label: string }[] = [
  { id: "beban-dosen", label: "Beban Dosen" },
  { id: "prodi-summary", label: "Per-Prodi Summary" },
  { id: "pivot", label: "Pivot Individu" },
];

export default function RecapClient({
  programStudi,
  kelompokKeahlian,
  canEditTargets,
}: {
  programStudi: ProgramStudi[];
  kelompokKeahlian: KelompokKeahlian[];
  canEditTargets: boolean;
}) {
  const [tab, setTab] = useState<Tab>("beban-dosen");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <a
          href="/api/export/plotting"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
        >
          Export current plotting (.xlsx)
        </a>
      </div>

      {tab === "beban-dosen" && (
        <BebanDosenTab programStudi={programStudi} kelompokKeahlian={kelompokKeahlian} />
      )}
      {tab === "prodi-summary" && <ProdiSummaryTab canEditTargets={canEditTargets} />}
      {tab === "pivot" && <PivotTab />}
    </div>
  );
}
