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
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {canEdit
          ? "Assign or reassign dosen to course sections for the active semester."
          : "Read-only view of the current plotting."}
      </p>
      <PlottingClient
        programStudi={programStudi}
        defaultProdiId={user?.prodiId ?? null}
        canEdit={canEdit}
        canManageSections={canEdit}
        dosenOptions={dosenOptions}
      />
    </div>
  );
}
