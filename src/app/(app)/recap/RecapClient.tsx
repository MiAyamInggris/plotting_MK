"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSemester } from "@/components/SemesterContext";
import BebanDosenTab from "./BebanDosenTab";
import ProdiSummaryTab from "./ProdiSummaryTab";
import PivotTab from "./PivotTab";
import KelasBySemesterTab from "./KelasBySemesterTab";

type Role = "ADMIN" | "KAPRODI" | "KETUA_KK" | "ACADEMIC";
type ProgramStudi = { id: string; kode: string; nama: string };
type KelompokKeahlian = { id: string; nama: string };

export default function RecapClient({
  role,
  userProdiId,
  programStudi,
  kelompokKeahlian,
  canEditTargets,
}: {
  role: Role;
  userProdiId: string | null;
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
          <TabsTrigger value="beban-dosen">Rekapitulasi Beban Dosen</TabsTrigger>
          <TabsTrigger value="kelas-by-semester">Rekapitulasi Kelas per Semester</TabsTrigger>
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
      <TabsContent value="kelas-by-semester">
        <KelasBySemesterTab role={role} userProdiId={userProdiId} programStudi={programStudi} />
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
