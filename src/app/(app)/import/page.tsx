import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import ImportClient from "./ImportClient";

export default async function ImportPage() {
  const user = await getSessionUser();
  if (!canManageMasterData(user)) redirect("/");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Import</h1>
      <p className="mt-1 text-sm text-slate-600">
        Import the dosen master first, then the plotting workbook. Both imports are
        idempotent — re-importing updates existing records instead of duplicating them.
      </p>
      <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Re-importing the plotting workbook will overwrite matching course offerings and class
        sections. Consider{" "}
        <a href="/api/export/plotting" className="font-medium underline">
          exporting the current plotting
        </a>{" "}
        first as a backup.
      </div>
      <div className="mt-6">
        <ImportClient />
      </div>
    </div>
  );
}
