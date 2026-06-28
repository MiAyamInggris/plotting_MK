"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, CalendarRange } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useSemester } from "@/components/SemesterContext";

type Role = "ADMIN" | "KAPRODI" | "KETUA_KK";
type ProgramStudi = { id: string; kode: string; nama: string };

type Item = {
  id: string;
  kodeKelas: string;
  sks: number;
  kodeMK: string;
  namaMK: string;
  prodiKode: string;
  dosen: { kode: string; nama: string } | null;
};
type Group = {
  semesterKe: number;
  jumlahKelas: number;
  totalSks: number;
  unassignedKelas: number;
  unassignedSks: number;
  items: Item[];
};

const ALL = "__all__";

export default function KelasBySemesterTab({
  role,
  userProdiId,
  programStudi,
}: {
  role: Role;
  userProdiId: string | null;
  programStudi: ProgramStudi[];
}) {
  const { semesterId } = useSemester();
  const isKaprodi = role === "KAPRODI";
  const [prodiId, setProdiId] = useState(isKaprodi ? userProdiId ?? "" : ALL);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  async function load() {
    if (!semesterId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ semesterPeriodeId: semesterId });
      if (!isKaprodi && prodiId !== ALL) params.set("prodiId", prodiId);
      const res = await fetch(`/api/recap/kelas-by-semester?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setGroups(data.groups);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prodiId, semesterId]);

  const chartData = groups.map((g) => ({
    semester: `Semester ${g.semesterKe}`,
    assigned: g.totalSks - g.unassignedSks,
    unassigned: g.unassignedSks,
  }));

  return (
    <Card>
      <CardContent className="space-y-4">
        {!isKaprodi && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Prodi</Label>
              <Select value={prodiId} onValueChange={setProdiId}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Prodi</SelectItem>
                  {programStudi.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.kode} — {p.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title="No opened classes"
            description="No classes have been opened for this scope and period."
          />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(160, groups.length * 50 + 40)}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="semester" width={92} tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="assigned" stackId="sks" name="Assigned" fill="#64748B" radius={[4, 0, 0, 4]} />
                <Bar dataKey="unassigned" stackId="sks" name="Unassigned" fill="#ED1E28" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="space-y-2">
              {groups.map((g) => (
                <div key={g.semesterKe} className="rounded-lg border border-border bg-card">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 p-4 text-left"
                    onClick={() => setExpanded(expanded === g.semesterKe ? null : g.semesterKe)}
                  >
                    <div className="flex items-center gap-2">
                      {expanded === g.semesterKe ? (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      )}
                      <span className="font-medium text-foreground">Semester {g.semesterKe}</span>
                      <span className="text-xs text-muted-foreground">
                        {g.jumlahKelas} kelas · {g.totalSks} sks
                      </span>
                    </div>
                    {g.unassignedKelas > 0 ? (
                      <Badge variant="destructive">
                        {g.unassignedKelas} kelas belum di-plotting ({g.unassignedSks} sks)
                      </Badge>
                    ) : (
                      <Badge>Fully plotted</Badge>
                    )}
                  </button>
                  {expanded === g.semesterKe && (
                    <div className="flex flex-wrap gap-2 border-t border-border p-4">
                      {g.items.map((k) => (
                        <span
                          key={k.id}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
                        >
                          <span className="font-mono text-muted-foreground">
                            {k.prodiKode} · {k.kodeMK} · {k.kodeKelas}
                          </span>
                          {k.dosen ? (
                            <span className="text-foreground">
                              {k.dosen.kode} — {k.dosen.nama}
                            </span>
                          ) : (
                            <span className="italic text-muted-foreground">Belum di-plotting</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
