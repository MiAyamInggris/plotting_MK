import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canManageUsers } from "@/lib/authz";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!canManageUsers(user)) redirect("/");

  return <UsersClient />;
}
