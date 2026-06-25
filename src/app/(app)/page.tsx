import { Card, CardContent } from "@/components/ui/card";

export default function DashboardPage() {
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
