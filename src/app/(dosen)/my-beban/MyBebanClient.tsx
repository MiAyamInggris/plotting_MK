"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useSemester } from "@/components/SemesterContext";
import { PivotResult, type Pivot } from "@/components/PivotResult";

export default function MyBebanClient() {
  const { semesterId } = useSemester();
  const [pivot, setPivot] = useState<Pivot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!semesterId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // No kode param: the server forces self-lookup for the DOSEN role.
        const res = await fetch(`/api/recap/pivot?semesterPeriodeId=${semesterId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed to load");
        if (!cancelled) setPivot(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [semesterId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!pivot) return null;

  return <PivotResult pivot={pivot} />;
}
