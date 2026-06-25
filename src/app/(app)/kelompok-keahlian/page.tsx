import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import KelompokKeahlianClient from "./KelompokKeahlianClient";

export default async function KelompokKeahlianPage() {
  const user = await getSessionUser();
  if (!canManageMasterData(user)) redirect("/");

  return <KelompokKeahlianClient />;
}
