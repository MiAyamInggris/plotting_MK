import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canManageSemesters } from "@/lib/authz";
import SemestersClient from "./SemestersClient";

export default async function SemestersPage() {
  const user = await getSessionUser();
  if (!canManageSemesters(user)) redirect("/");

  return <SemestersClient />;
}
