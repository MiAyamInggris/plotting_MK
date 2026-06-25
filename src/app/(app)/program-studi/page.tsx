import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import ProgramStudiClient from "./ProgramStudiClient";

export default async function ProgramStudiPage() {
  const user = await getSessionUser();
  if (!canManageMasterData(user)) redirect("/");

  return <ProgramStudiClient />;
}
