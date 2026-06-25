import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ImportClient from "./ImportClient";

export default async function ImportPage() {
  const user = await getSessionUser();
  if (!canManageMasterData(user)) redirect("/");

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Import the dosen master first, then the plotting workbook. Both imports are
          idempotent — re-importing updates existing records instead of duplicating them.
        </p>
        <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
          <AlertDescription className="text-amber-800 dark:text-amber-400">
            Re-importing the plotting workbook will overwrite matching course offerings and class
            sections. Consider{" "}
            <a href="/api/export/plotting" className="font-medium underline">
              exporting the current plotting
            </a>{" "}
            first as a backup.
          </AlertDescription>
        </Alert>
      </div>
      <ImportClient />
    </div>
  );
}
