"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSemester } from "@/components/SemesterContext";

export default function SemesterPicker() {
  const { semesters, semesterId, setSemesterId } = useSemester();

  if (semesters.length === 0) return null;

  return (
    <Select value={semesterId} onValueChange={setSemesterId}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {semesters.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.nama}
            {!s.aktif && " (read-only)"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
