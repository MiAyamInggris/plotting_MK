import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import MataKuliahClient from "./MataKuliahClient";

export default async function MataKuliahPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "KAPRODI")) redirect("/");

  const programStudi = await prisma.programStudi.findMany({
    orderBy: { kode: "asc" },
  });

  return (
    <MataKuliahClient
      role={user.role}
      userProdiId={user.prodiId ?? null}
      programStudi={programStudi}
    />
  );
}
