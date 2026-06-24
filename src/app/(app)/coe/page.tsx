import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import CoeClient from "./CoeClient";

export default async function CoePage() {
  const user = await getSessionUser();
  if (!canManageMasterData(user)) redirect("/");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Center of Excellence</h1>
      <div className="mt-6">
        <CoeClient />
      </div>
    </div>
  );
}
