import type { Role } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  KAPRODI: "Kaprodi",
  KETUA_KK: "Ketua KK",
  DOSEN: "Dosen",
  ACADEMIC: "Academic",
};

const ROLE_CLASSES: Record<Role, string> = {
  ADMIN: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  KAPRODI: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  KETUA_KK: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  DOSEN: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  ACADEMIC: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
};

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", ROLE_CLASSES[role], className)}>
      {ROLE_LABEL[role]}
    </Badge>
  );
}
