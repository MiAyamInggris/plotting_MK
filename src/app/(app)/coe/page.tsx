import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import CoeClient from "./CoeClient";

export default async function CoePage() {
  const user = await getSessionUser();
  if (!canManageMasterData(user)) redirect("/");

  return <CoeClient />;
}
