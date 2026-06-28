import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessionUser } from "@/lib/session";
import KaprodiDashboard from "./KaprodiDashboard";
import KetuaKkDashboard from "./KetuaKkDashboard";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (user.role === "KAPRODI") return <KaprodiDashboard />;
  if (user.role === "KETUA_KK") return <KetuaKkDashboard />;

  return (
    <Card>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Welcome to Plotting MK. Use the navigation to manage data and plotting.
        </p>
      </CardContent>
    </Card>
  );
}
