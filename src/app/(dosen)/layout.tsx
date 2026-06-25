import { redirect } from "next/navigation";
import { requireSessionUser, getAppShellProps } from "@/lib/appShellData";
import AppShell from "@/components/AppShell";

export default async function DosenGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSessionUser();
  if (user.role !== "DOSEN") redirect("/");

  const { scopeLabel, semesters } = await getAppShellProps(user);

  return (
    <AppShell
      name={user.name ?? user.email ?? "User"}
      role={user.role}
      scopeLabel={scopeLabel}
      semesters={semesters}
    >
      {children}
    </AppShell>
  );
}
