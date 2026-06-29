"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ROLE_LABEL } from "@/components/RoleBadge";

export default function ImpersonationBanner({
  role,
  scopeLabel,
}: {
  role: Role;
  scopeLabel: string | null;
}) {
  const router = useRouter();
  const [returning, setReturning] = useState(false);

  async function returnToAdmin() {
    setReturning(true);
    try {
      await fetch("/api/impersonation", { method: "DELETE" });
      router.push("/");
      router.refresh();
    } finally {
      setReturning(false);
    }
  }

  return (
    <div className="flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
      <span>
        Viewing as {ROLE_LABEL[role]}
        {scopeLabel ? ` — ${scopeLabel}` : ""}
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 border-amber-950/30 bg-amber-50 text-amber-950 hover:bg-amber-100"
        onClick={returnToAdmin}
        disabled={returning}
      >
        {returning ? "Returning…" : "Return to Admin"}
      </Button>
    </div>
  );
}
