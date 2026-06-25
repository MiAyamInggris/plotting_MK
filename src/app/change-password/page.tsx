import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <ChangePasswordForm />
    </div>
  );
}
