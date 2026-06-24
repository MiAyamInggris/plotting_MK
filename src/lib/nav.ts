import type { Role } from "@prisma/client";

export type NavItem = {
  href: string;
  label: string;
  roles: Role[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", roles: ["ADMIN", "KAPRODI", "KETUA_KK"] },
  { href: "/plotting", label: "Plotting", roles: ["ADMIN", "KAPRODI", "KETUA_KK"] },
  { href: "/recap", label: "Recap", roles: ["ADMIN", "KAPRODI", "KETUA_KK"] },
  { href: "/mata-kuliah", label: "Mata Kuliah", roles: ["ADMIN", "KAPRODI"] },
  { href: "/dosen", label: "Dosen", roles: ["ADMIN", "KAPRODI", "KETUA_KK"] },
  { href: "/program-studi", label: "Program Studi", roles: ["ADMIN"] },
  { href: "/kelompok-keahlian", label: "Kelompok Keahlian", roles: ["ADMIN"] },
  { href: "/coe", label: "Center of Excellence", roles: ["ADMIN"] },
  { href: "/import", label: "Import", roles: ["ADMIN"] },
  { href: "/users", label: "Users", roles: ["ADMIN"] },
];
