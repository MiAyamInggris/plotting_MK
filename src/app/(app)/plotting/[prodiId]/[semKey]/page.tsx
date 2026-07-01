import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import MataKuliahListClient from "./MataKuliahListClient";

export default async function SemesterPlottingPage({
  params,
}: {
  params: Promise<{ prodiId: string; semKey: string }>;
}) {
  const { prodiId, semKey } = await params;
  const user = await getSessionUser();
  if (user?.role === "ACADEMIC") redirect("/recap");
  const canEdit = !!user && (user.role === "ADMIN" || user.role === "KETUA_KK");

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {canEdit
          ? "Pilih mata kuliah untuk menetapkan dosen pengampu."
          : "Tampilan read-only plotting saat ini."}
      </p>
      <MataKuliahListClient prodiId={prodiId} semKey={semKey} />
    </div>
  );
}
