import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/AppShell";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { user } = session;

  let scopeLabel: string | null = null;
  if (user.role === "KAPRODI" && user.prodiId) {
    const prodi = await prisma.programStudi.findUnique({
      where: { id: user.prodiId },
      select: { nama: true },
    });
    scopeLabel = prodi?.nama ?? null;
  } else if (user.role === "KETUA_KK" && user.kkId) {
    const kk = await prisma.kelompokKeahlian.findUnique({
      where: { id: user.kkId },
      select: { nama: true },
    });
    scopeLabel = kk?.nama ?? null;
  } else if (user.role === "ADMIN") {
    scopeLabel = "All Program Studi";
  }

  return (
    <AppShell name={user.name ?? user.email ?? "User"} role={user.role} scopeLabel={scopeLabel}>
      {children}
    </AppShell>
  );
}
