import type { Role } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CalendarRange,
  BarChart3,
  BookOpen,
  GraduationCap,
  Building2,
  Layers,
  Award,
  Upload,
  UserCog,
  CalendarClock,
  UserRound,
  Settings2,
  ScrollText,
} from "lucide-react";

export type NavGroup = "Overview" | "Master Data" | "Administration";

export type NavItem = {
  href: string;
  label: string;
  roles: Role[];
  icon: LucideIcon;
  group: NavGroup;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    roles: ["ADMIN", "KAPRODI", "KETUA_KK", "ACADEMIC"],
    icon: LayoutDashboard,
    group: "Overview",
  },
  {
    href: "/plotting",
    label: "Plotting",
    roles: ["ADMIN", "KAPRODI", "KETUA_KK"],
    icon: CalendarRange,
    group: "Overview",
  },
  {
    href: "/recap",
    label: "Recap",
    roles: ["ADMIN", "KAPRODI", "KETUA_KK", "ACADEMIC"],
    icon: BarChart3,
    group: "Overview",
  },
  {
    href: "/mata-kuliah",
    label: "Mata Kuliah",
    roles: ["ADMIN", "KAPRODI"],
    icon: BookOpen,
    group: "Master Data",
  },
  {
    href: "/setting-mk-kelas",
    label: "Pengaturan Mata Kuliah dan Kelas",
    roles: ["ADMIN", "KAPRODI"],
    icon: Settings2,
    group: "Master Data",
  },
  {
    href: "/dosen",
    label: "Dosen",
    roles: ["ADMIN", "KAPRODI", "KETUA_KK"],
    icon: GraduationCap,
    group: "Master Data",
  },
  {
    href: "/program-studi",
    label: "Program Studi",
    roles: ["ADMIN"],
    icon: Building2,
    group: "Master Data",
  },
  {
    href: "/kelompok-keahlian",
    label: "Kelompok Keahlian",
    roles: ["ADMIN"],
    icon: Layers,
    group: "Master Data",
  },
  {
    href: "/coe",
    label: "Center of Excellence",
    roles: ["ADMIN"],
    icon: Award,
    group: "Master Data",
  },
  {
    href: "/semesters",
    label: "Semesters",
    roles: ["ADMIN"],
    icon: CalendarClock,
    group: "Administration",
  },
  {
    href: "/import",
    label: "Import",
    roles: ["ADMIN"],
    icon: Upload,
    group: "Administration",
  },
  {
    href: "/users",
    label: "Users",
    roles: ["ADMIN"],
    icon: UserCog,
    group: "Administration",
  },
  {
    href: "/logs",
    label: "Activity Logs",
    roles: ["ADMIN"],
    icon: ScrollText,
    group: "Administration",
  },
  {
    href: "/my-beban",
    label: "My Beban",
    roles: ["DOSEN"],
    icon: UserRound,
    group: "Overview",
  },
];

export function navItemForPath(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
  );
}
