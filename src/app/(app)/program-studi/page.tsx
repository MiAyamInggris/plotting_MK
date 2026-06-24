import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import ProgramStudiClient from "./ProgramStudiClient";

export default async function ProgramStudiPage() {
  const user = await getSessionUser();
  if (!canManageMasterData(user)) redirect("/");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Program Studi</h1>
      <div className="mt-6">
        <ProgramStudiClient />
      </div>
    </div>
  );
}
