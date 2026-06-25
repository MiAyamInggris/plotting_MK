import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listSemestersFor } from "@/lib/semester";
import type { AuthUser } from "@/lib/authz";

// Shared by every authenticated route group's layout: resolves the session,
// bounces to /login if absent, and forces /change-password before anything
// else if the account still has a predictable default password. Re-checks
// mustChangePassword against the DB on every render rather than the JWT,
// since the JWT only refreshes at next login — a same-session password
// change would otherwise keep re-triggering this gate.
export async function requireSessionUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true },
  });
  if (dbUser?.mustChangePassword) redirect("/change-password");

  return session.user;
}

export async function getAppShellProps(user: AuthUser) {
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
  } else if (user.role === "DOSEN" && user.dosenId) {
    const dosen = await prisma.dosen.findUnique({
      where: { id: user.dosenId },
      select: { kode: true, nama: true },
    });
    scopeLabel = dosen ? `${dosen.kode} — ${dosen.nama}` : null;
  }

  const semesters = await listSemestersFor(user);

  return { scopeLabel, semesters };
}
