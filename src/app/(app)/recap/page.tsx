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
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Recap</h1>
      <p className="mt-1 text-sm text-slate-600">
        Live computed dashboards for the active semester — beban dosen, per-prodi staffing, and
        per-lecturer drill-down.
      </p>
      <div className="mt-6">
        <RecapClient
          programStudi={programStudi}
          kelompokKeahlian={kelompokKeahlian}
          canEditTargets={canManageMasterData(user)}
        />
      </div>
    </div>
  );
}
