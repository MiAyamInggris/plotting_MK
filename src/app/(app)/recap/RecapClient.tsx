"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSemester } from "@/components/SemesterContext";
import BebanDosenTab from "./BebanDosenTab";
import ProdiSummaryTab from "./ProdiSummaryTab";
import PivotTab from "./PivotTab";

type ProgramStudi = { id: string; kode: string; nama: string };
type KelompokKeahlian = { id: string; nama: string };

export default function RecapClient({
  programStudi,
  kelompokKeahlian,
  canEditTargets,
}: {
  programStudi: ProgramStudi[];
  kelompokKeahlian: KelompokKeahlian[];
  canEditTargets: boolean;
}) {
  const { semesterId, activeSemesterId } = useSemester();
  const canEditTargetsHere = canEditTargets && semesterId === activeSemesterId;

  return (
    <Tabs defaultValue="beban-dosen" className="gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="beban-dosen">Beban Dosen</TabsTrigger>
          <TabsTrigger value="prodi-summary">Per-Prodi Summary</TabsTrigger>
          <TabsTrigger value="pivot">Pivot Individu</TabsTrigger>
        </TabsList>

        <Button variant="outline" asChild>
          <a href={`/api/export/plotting?semesterPeriodeId=${semesterId}`}>
            <Download className="size-4" />
            Export current plotting (.xlsx)
          </a>
        </Button>
      </div>

      <TabsContent value="beban-dosen">
        <BebanDosenTab programStudi={programStudi} kelompokKeahlian={kelompokKeahlian} />
      </TabsContent>
      <TabsContent value="prodi-summary">
        <ProdiSummaryTab canEditTargets={canEditTargetsHere} />
      </TabsContent>
      <TabsContent value="pivot">
        <PivotTab />
      </TabsContent>
    </Tabs>
  );
}
