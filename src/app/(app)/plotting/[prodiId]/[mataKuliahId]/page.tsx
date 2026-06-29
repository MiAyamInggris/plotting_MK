import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canRegisterDlb } from "@/lib/authz";
import ClassAssignmentClient from "./ClassAssignmentClient";

export default async function ClassAssignmentPage({
  params,
}: {
  params: Promise<{ prodiId: string; mataKuliahId: string }>;
}) {
  const { prodiId, mataKuliahId } = await params;
  const user = await getSessionUser();
  if (user?.role === "ACADEMIC") redirect("/recap");
  const canEdit = !!user && (user.role === "ADMIN" || user.role === "KETUA_KK");

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {canEdit
          ? "Assign or reassign dosen to course sections for the active semester."
          : "Read-only view of the current plotting."}
      </p>
      <ClassAssignmentClient
        prodiId={prodiId}
        mataKuliahId={mataKuliahId}
        canEdit={canEdit}
        canRegisterDlb={canRegisterDlb(user)}
      />
    </div>
  );
}
