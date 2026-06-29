import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canManageUsers } from "@/lib/authz";
import LogsClient from "./LogsClient";

export default async function LogsPage() {
  const user = await getSessionUser();
  if (!canManageUsers(user)) redirect("/");

  return <LogsClient />;
}
