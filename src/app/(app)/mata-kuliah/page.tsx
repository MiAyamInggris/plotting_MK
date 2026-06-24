import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import MataKuliahClient from "./MataKuliahClient";

export default async function MataKuliahPage() {
  const user = await getSessionUser();
  if (!user || user.role === "KETUA_KK") redirect("/");

  const programStudi = await prisma.programStudi.findMany({
    orderBy: { kode: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Mata Kuliah & SKS</h1>
      <p className="mt-1 text-sm text-slate-600">
        {user.role === "KAPRODI"
          ? "Manage courses, SKS, and semester offerings for your Program Studi."
          : "Manage courses, SKS, and semester offerings for any Program Studi."}
      </p>
      <div className="mt-6">
        <MataKuliahClient
          role={user.role}
          userProdiId={user.prodiId ?? null}
          programStudi={programStudi}
        />
      </div>
    </div>
  );
}
