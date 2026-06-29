import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import { validateImportFile } from "@/lib/import/fileValidation";
import { importDosenMaster } from "@/lib/import/dosenMaster";
import { logActivity } from "@/lib/activityLog";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!canManageMasterData(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const fileError = validateImportFile(file);
  if (fileError) {
    return NextResponse.json({ error: fileError }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const report = await importDosenMaster(buffer);
    await logActivity({
      user: user!,
      action: "IMPORT",
      entityType: "Dosen",
      detail: JSON.stringify(report.counts),
      request,
    });
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 400 },
    );
  }
}
