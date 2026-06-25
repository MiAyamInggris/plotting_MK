import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import { importDosenEmail } from "@/lib/import/dosenEmail";

// Local-development convenience: import directly from the gitignored data/
// folder without a manual upload. Not intended for production use.
const LOCAL_PATH = path.join(process.cwd(), "data", "dosen-email.tsv");

export async function POST() {
  const user = await getSessionUser();
  if (!canManageMasterData(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(LOCAL_PATH);
  } catch {
    return NextResponse.json(
      { error: `Local file not found at ${LOCAL_PATH}` },
      { status: 404 },
    );
  }

  try {
    const report = await importDosenEmail(buffer);
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 400 },
    );
  }
}
