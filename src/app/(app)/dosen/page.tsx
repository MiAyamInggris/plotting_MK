import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import DosenClient from "./DosenClient";

export default async function DosenPage() {
  const user = await getSessionUser();
  if (user?.role === "ACADEMIC") redirect("/recap");
  const canEdit = canManageMasterData(user);

  return <DosenClient canEdit={canEdit} />;
}
