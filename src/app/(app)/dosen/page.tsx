import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import DosenClient from "./DosenClient";

export default async function DosenPage() {
  const user = await getSessionUser();
  const canEdit = canManageMasterData(user);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Dosen</h1>
      <p className="mt-1 text-sm text-slate-600">
        {canEdit
          ? "Manage lecturer master data."
          : "Read-only view of lecturer master data."}
      </p>
      <div className="mt-6">
        <DosenClient canEdit={canEdit} />
      </div>
    </div>
  );
}
