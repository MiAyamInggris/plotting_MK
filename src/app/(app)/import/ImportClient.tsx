"use client";

import { useRef, useState } from "react";

type ImportWarning = {
  level: "warning" | "error";
  message: string;
  context?: string;
};

type ImportReport = {
  counts: Record<string, number>;
  warnings: ImportWarning[];
};

function ReportView({ report }: { report: ImportReport }) {
  return (
    <div className="mt-4 space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
      <div>
        <h3 className="text-xs font-semibold uppercase text-slate-500">Counts</h3>
        <dl className="mt-1 grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
          {Object.entries(report.counts).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-2 rounded bg-white px-2 py-1">
              <dt className="text-slate-500">{key}</dt>
              <dd className="font-medium text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {report.warnings.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase text-slate-500">
            Warnings ({report.warnings.length})
          </h3>
          <ul className="mt-1 max-h-64 space-y-1 overflow-y-auto text-sm">
            {report.warnings.map((w, i) => (
              <li
                key={i}
                className={`rounded px-2 py-1 ${
                  w.level === "error" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"
                }`}
              >
                {w.context && <span className="font-mono text-xs opacity-70">[{w.context}] </span>}
                {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ImportSection({
  title,
  description,
  uploadUrl,
  localUrl,
}: {
  title: string;
  description: string;
  uploadUrl: string;
  localUrl: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);

  async function runImport(opts: { local: boolean }) {
    setError(null);
    setReport(null);
    setBusy(true);
    try {
      let res: Response;
      if (opts.local) {
        res = await fetch(localUrl, { method: "POST" });
      } else {
        const file = fileInputRef.current?.files?.[0];
        if (!file) {
          throw new Error("Choose a file first");
        }
        const formData = new FormData();
        formData.set("file", file);
        res = await fetch(uploadUrl, { method: "POST", body: formData });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Import failed");
      }
      setReport(data.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="text-sm" />
        <button
          onClick={() => runImport({ local: false })}
          disabled={busy}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? "Importing…" : "Upload & Import"}
        </button>
        <button
          onClick={() => runImport({ local: true })}
          disabled={busy}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50"
          title="Reads the file directly from the local data/ folder (dev only)"
        >
          Use local data/ file
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {report && <ReportView report={report} />}
    </div>
  );
}

export default function ImportClient() {
  return (
    <div className="space-y-6">
      <ImportSection
        title="A. Dosen master"
        description='Sheet "DOSEN" from Data Dosen 2026_TUP_ Maret 2026.xlsx. Run this before the plotting import.'
        uploadUrl="/api/import/dosen"
        localUrl="/api/import/dosen/local"
      />
      <ImportSection
        title="B. Plotting workbook"
        description="Per-prodi sheets plus Beban Dosen from Plotting MK Tawar KK Semester Ganjil 2025_2026.xlsx."
        uploadUrl="/api/import/plotting"
        localUrl="/api/import/plotting/local"
      />
    </div>
  );
}
