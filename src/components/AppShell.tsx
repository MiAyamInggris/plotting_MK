import type { Role } from "@prisma/client";
import NavLinks from "@/components/NavLinks";
import SignOutButton from "@/components/SignOutButton";

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  KAPRODI: "Kaprodi",
  KETUA_KK: "Ketua KK",
};

export default function AppShell({
  name,
  role,
  scopeLabel,
  children,
}: {
  name: string;
  role: Role;
  scopeLabel: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col gap-4 border-r border-slate-200 bg-white p-4">
        <div className="px-3 py-2">
          <p className="text-lg font-semibold text-slate-900">Plotting MK</p>
        </div>
        <NavLinks role={role} />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div>
            <p className="text-sm font-medium text-slate-900">{name}</p>
            <p className="text-xs text-slate-500">
              {ROLE_LABEL[role]}
              {scopeLabel ? ` · ${scopeLabel}` : ""}
            </p>
          </div>
          <SignOutButton />
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
