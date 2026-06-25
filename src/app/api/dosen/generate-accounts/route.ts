import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import { generateDosenAccounts } from "@/lib/dosenAccounts";

export async function POST() {
  const user = await getSessionUser();
  if (!canManageMasterData(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const report = await generateDosenAccounts();
  return NextResponse.json({ report });
}
