import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canRegisterDlb } from "@/lib/authz";
import ClassAssignmentClient from "./ClassAssignmentClient";

export default async function ClassAssignmentPage({
  params,
}: {
  params: Promise<{ prodiId: string; semKey: string; mataKuliahId: string }>;
}) {
  const { prodiId, semKey, mataKuliahId } = await params;
  const user = await getSessionUser();
  if (user?.role === "ACADEMIC") redirect("/recap");
  const canEdit = !!user && (user.role === "ADMIN" || user.role === "KETUA_KK");

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {canEdit
          ? "Tetapkan atau ubah dosen pengampu untuk kelas berikut."
          : "Tampilan read-only plotting saat ini."}
      </p>
      <ClassAssignmentClient
        prodiId={prodiId}
        semKey={semKey}
        mataKuliahId={mataKuliahId}
        canEdit={canEdit}
        canRegisterDlb={canRegisterDlb(user)}
      />
    </div>
  );
}
