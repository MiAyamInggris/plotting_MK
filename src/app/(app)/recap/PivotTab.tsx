"use client";

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSemester } from "@/components/SemesterContext";
import { PivotResult, type Pivot } from "@/components/PivotResult";

export default function PivotTab() {
  const { semesterId } = useSemester();
  const [kode, setKode] = useState("");
  const [pivot, setPivot] = useState<Pivot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    if (!kode.trim()) return;
    setLoading(true);
    setError(null);
    setPivot(null);
    try {
      const res = await fetch(
        `/api/recap/pivot?kode=${encodeURIComponent(kode.trim())}&semesterPeriodeId=${semesterId}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Not found");
      setPivot(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <form onSubmit={onSearch} className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="pivot-kode" className="text-xs text-muted-foreground">
                Kode Dosen
              </Label>
              <Input
                id="pivot-kode"
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                placeholder="e.g. WPS"
                className="w-40 uppercase"
              />
            </div>
            <Button type="submit" disabled={loading}>
              <Search className="size-4" />
              {loading ? "Searching…" : "Search"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {pivot && <PivotResult pivot={pivot} />}
    </div>
  );
}
