import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canManageUsers } from "@/lib/authz";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!canManageUsers(user)) redirect("/");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
      <p className="mt-1 text-sm text-slate-600">
        Create accounts and bind Kaprodi to a Program Studi or Ketua KK to a Kelompok Keahlian.
      </p>
      <div className="mt-6">
        <UsersClient />
      </div>
    </div>
  );
}
