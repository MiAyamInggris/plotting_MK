import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessionUser } from "@/lib/session";
import KaprodiDashboard from "./KaprodiDashboard";
import KetuaKkDashboard from "./KetuaKkDashboard";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (user.role === "KAPRODI") return <KaprodiDashboard />;
  // Academic gets the same all-prodi view Ketua KK sees -- it's already an
  // unscoped, every-prodi ratio dashboard with no KK-specific filtering.
  if (user.role === "KETUA_KK" || user.role === "ACADEMIC") return <KetuaKkDashboard />;

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
