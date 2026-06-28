import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import SettingMkKelasClient from "./SettingMkKelasClient";

export default async function SettingMkKelasPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "KAPRODI")) redirect("/");

  const programStudi = await prisma.programStudi.findMany({
    orderBy: { kode: "asc" },
  });

  return (
    <SettingMkKelasClient
      role={user.role}
      userProdiId={user.prodiId ?? null}
      programStudi={programStudi}
    />
  );
}
