import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canEditCourses } from "@/lib/authz";
import { validateImportFile } from "@/lib/import/fileValidation";
import { importMataKuliahCatalog } from "@/lib/import/mataKuliahCatalog";
import { logActivity } from "@/lib/activityLog";

export async function POST(request: Request) {
  const user = await getSessionUser();

  const formData = await request.formData();
  const file = formData.get("file");
  const prodiId = formData.get("prodiId");

  if (typeof prodiId !== "string" || !prodiId) {
    return NextResponse.json({ error: "prodiId is required" }, { status: 400 });
  }
  if (!canEditCourses(user, prodiId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const fileError = validateImportFile(file);
  if (fileError) {
    return NextResponse.json({ error: fileError }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const report = await importMataKuliahCatalog(buffer, prodiId);
    await logActivity({
      user: user!,
      action: "IMPORT",
      entityType: "MataKuliah",
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
