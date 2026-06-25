import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import DosenClient from "./DosenClient";

export default async function DosenPage() {
  const user = await getSessionUser();
  const canEdit = canManageMasterData(user);

  return <DosenClient canEdit={canEdit} />;
}
