import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { resolveSemester } from "@/lib/semester";
import { computeDosenLoadBreakdown } from "@/lib/bebanDosen";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const semesterResult = await resolveSemester(user, searchParams.get("semesterPeriodeId"));
  if (!semesterResult.ok) {
    return NextResponse.json({ error: semesterResult.error }, { status: semesterResult.status });
  }

  const breakdown = await computeDosenLoadBreakdown(id, semesterResult.semester.id);
  return NextResponse.json(breakdown);
}
