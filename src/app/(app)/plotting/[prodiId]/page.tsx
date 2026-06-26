import { getSessionUser } from "@/lib/session";
import MataKuliahListClient from "./MataKuliahListClient";

export default async function ProdiPlottingPage({
  params,
}: {
  params: Promise<{ prodiId: string }>;
}) {
  const { prodiId } = await params;
  const user = await getSessionUser();
  const canEdit = !!user && (user.role === "ADMIN" || user.role === "KETUA_KK");

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {canEdit
          ? "Choose a Mata Kuliah to assign or change its dosen."
          : "Read-only view of the current plotting."}
      </p>
      <MataKuliahListClient prodiId={prodiId} />
    </div>
  );
}
