"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import NavLinks from "@/components/NavLinks";
import UserMenu from "@/components/UserMenu";
import { navItemForPath } from "@/lib/nav";

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
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = navItemForPath(pathname)?.label ?? "Plotting MK";

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r border-border bg-card p-4 lg:flex">
        <div className="px-3 py-2">
          <p className="text-lg font-semibold text-foreground">Plotting MK</p>
        </div>
        <NavLinks role={role} />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background px-4 lg:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Menu className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b border-border">
                <SheetTitle>Plotting MK</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-4">
                <NavLinks role={role} onNavigate={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <h1 className="flex-1 truncate text-lg font-medium text-foreground">{title}</h1>

          <UserMenu name={name} role={role} scopeLabel={scopeLabel} />
        </header>

        <main className="flex-1 p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
