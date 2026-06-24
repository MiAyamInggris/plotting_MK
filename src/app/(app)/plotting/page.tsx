import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import PlottingClient from "./PlottingClient";

export default async function PlottingPage() {
  const user = await getSessionUser();
  const programStudi = await prisma.programStudi.findMany({ orderBy: { kode: "asc" } });

  const canEdit = !!user && (user.role === "ADMIN" || user.role === "KETUA_KK");

  let dosenOptions: { id: string; kode: string; nama: string; kkId: string | null; aktif: boolean }[] = [];
  if (user) {
    dosenOptions = await prisma.dosen.findMany({
      where: {
        aktif: true,
        ...(user.role === "KETUA_KK" ? { kkId: user.kkId } : {}),
      },
      orderBy: { kode: "asc" },
      select: { id: true, kode: true, nama: true, kkId: true, aktif: true },
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Plotting</h1>
      <p className="mt-1 text-sm text-slate-600">
        {canEdit
          ? "Assign or reassign dosen to course sections for the active semester."
          : "Read-only view of the current plotting."}
      </p>
      <div className="mt-6">
        <PlottingClient
          programStudi={programStudi}
          defaultProdiId={user?.prodiId ?? null}
          canEdit={canEdit}
          canManageSections={canEdit}
          dosenOptions={dosenOptions}
        />
      </div>
    </div>
  );
}
