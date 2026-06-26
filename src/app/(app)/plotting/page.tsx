import { getSessionUser } from "@/lib/session";
import { canRegisterDlb } from "@/lib/authz";
import PlottingClient from "./PlottingClient";

export default async function PlottingPage() {
  const user = await getSessionUser();

  const canEdit = !!user && (user.role === "ADMIN" || user.role === "KETUA_KK");

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {canEdit
          ? "Assign or reassign dosen to course sections for the active semester."
          : "Read-only view of the current plotting."}
      </p>
      <PlottingClient
        defaultProdiId={user?.prodiId ?? null}
        canEdit={canEdit}
        canManageSections={canEdit}
        canRegisterDlb={canRegisterDlb(user)}
      />
    </div>
  );
}
