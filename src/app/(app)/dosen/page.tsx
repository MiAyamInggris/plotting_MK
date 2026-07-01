import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canManageMasterData, canRegisterDlb } from "@/lib/authz";
import DosenClient from "./DosenClient";

export default async function DosenPage() {
  const user = await getSessionUser();
  if (user?.role === "ACADEMIC") redirect("/recap");
  const canEdit = canManageMasterData(user);
  const canAddDlb = canRegisterDlb(user);

  return <DosenClient canEdit={canEdit} canAddDlb={canAddDlb} />;
}
