import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import ProdiListClient from "./ProdiListClient";

export default async function PlottingPage() {
  const user = await getSessionUser();
  if (user?.role === "ACADEMIC") redirect("/recap");
  const canEdit = !!user && (user.role === "ADMIN" || user.role === "KETUA_KK");

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {canEdit
          ? "Choose a Program Studi to see and plot its unfinished classes."
          : "Read-only view of the current plotting."}
      </p>
      <ProdiListClient />
    </div>
  );
}
