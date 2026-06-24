import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import KelompokKeahlianClient from "./KelompokKeahlianClient";

export default async function KelompokKeahlianPage() {
  const user = await getSessionUser();
  if (!canManageMasterData(user)) redirect("/");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Kelompok Keahlian</h1>
      <div className="mt-6">
        <KelompokKeahlianClient />
      </div>
    </div>
  );
}
