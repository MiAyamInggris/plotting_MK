"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type SemesterOption = {
  id: string;
  nama: string;
  tipe: "GANJIL" | "GENAP";
  tahunAjaran: string;
  aktif: boolean;
  visibleToScopedRoles: boolean;
};

type SemesterContextValue = {
  semesters: SemesterOption[];
  semesterId: string;
  setSemesterId: (id: string) => void;
  activeSemesterId: string | null;
};

const SemesterContext = createContext<SemesterContextValue | null>(null);

export function SemesterProvider({
  semesters,
  children,
}: {
  semesters: SemesterOption[];
  children: React.ReactNode;
}) {
  const activeSemesterId = semesters.find((s) => s.aktif)?.id ?? null;
  const [semesterId, setSemesterId] = useState(activeSemesterId ?? semesters[0]?.id ?? "");

  const value = useMemo(
    () => ({ semesters, semesterId, setSemesterId, activeSemesterId }),
    [semesters, semesterId, activeSemesterId],
  );

  return <SemesterContext.Provider value={value}>{children}</SemesterContext.Provider>;
}

export function useSemester() {
  const ctx = useContext(SemesterContext);
  if (!ctx) throw new Error("useSemester must be used within a SemesterProvider");
  return ctx;
}
