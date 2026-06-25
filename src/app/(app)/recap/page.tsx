import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import RecapClient from "./RecapClient";

export default async function RecapPage() {
  const user = await getSessionUser();
  const [programStudi, kelompokKeahlian] = await Promise.all([
    prisma.programStudi.findMany({ orderBy: { kode: "asc" } }),
    prisma.kelompokKeahlian.findMany({ orderBy: { nama: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Live computed dashboards for the active semester — beban dosen, per-prodi staffing, and
        per-lecturer drill-down.
      </p>
      <RecapClient
        programStudi={programStudi}
        kelompokKeahlian={kelompokKeahlian}
        canEditTargets={canManageMasterData(user)}
      />
    </div>
  );
}
