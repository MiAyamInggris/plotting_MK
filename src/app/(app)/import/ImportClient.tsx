"use client";

import { useRef, useState } from "react";
import { Upload, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

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
    <div className="mt-4 space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <div>
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Counts</h3>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {Object.entries(report.counts).map(([key, value]) => (
            <div
              key={key}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-1.5"
            >
              <dt className="text-muted-foreground">{key}</dt>
              <dd className="font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {report.warnings.length > 0 && (
        <div>
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Warnings ({report.warnings.length})
          </h3>
          <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto text-sm">
            {report.warnings.map((w, i) => (
              <li
                key={i}
                className={cn(
                  "rounded-md px-2.5 py-1.5",
                  w.level === "error"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
                )}
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
  accept = ".xlsx,.xls",
}: {
  title: string;
  description: string;
  uploadUrl: string;
  localUrl: string;
  accept?: string;
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
      toast.success("Import completed");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Import failed";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="text-sm text-muted-foreground"
          />
          <Button onClick={() => runImport({ local: false })} disabled={busy}>
            <Upload className="size-4" />
            {busy ? "Importing…" : "Upload & Import"}
          </Button>
          <Button
            variant="outline"
            onClick={() => runImport({ local: true })}
            disabled={busy}
            title="Reads the file directly from the local data/ folder (dev only)"
          >
            <FolderOpen className="size-4" />
            Use local data/ file
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-3">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {report && <ReportView report={report} />}
      </CardContent>
    </Card>
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
      <ImportSection
        title="C. Dosen email"
        description="KODE / NAMA / E-MAIL rows, matched to existing dosen by KODE. Run before generating dosen login accounts."
        uploadUrl="/api/import/dosen-email"
        localUrl="/api/import/dosen-email/local"
        accept=".xlsx,.xls,.csv,.tsv"
      />
    </div>
  );
}
