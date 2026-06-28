export const JFA_GROUPS = ["AA", "L", "LK", "GB", "NJFA"] as const;
export type JfaGroup = (typeof JFA_GROUPS)[number];

// Pattern-matches the existing jfaSchema strings (src/lib/validation/dosen.ts)
// rather than an exact lookup table, so a future JFA value (e.g. a "Guru
// Besar" rank, which doesn't exist in the data today) classifies correctly
// without a code change.
export function classifyJfaGroup(jfa: string | null): JfaGroup {
  if (!jfa) return "NJFA";
  if (jfa.startsWith("Asisten Ahli")) return "AA";
  if (jfa.startsWith("Lektor Kepala")) return "LK";
  if (jfa.startsWith("Lektor")) return "L";
  if (jfa.includes("Guru Besar")) return "GB";
  return "NJFA";
}

export type DosenForRatio = {
  jenis: "TETAP" | "DLB";
  tingkatPendidikan: "S2" | "S3" | "ON_GOING_S3" | null;
  jfa: string | null;
};

export type ProdiRatioCounts = {
  totalDosen: number;
  dlbTetap: { dlb: number; tetap: number };
  // Pendidikan and JFA are computed over tetap dosen only -- DLB have no
  // tingkat pendidikan, and their JFA is excluded for consistency (their
  // presence is already captured by dlbTetap).
  pendidikan: { s2: number; s3: number; sedangS3: number };
  jfa: Record<JfaGroup, number>;
};

export function computeProdiRatios(dosenList: DosenForRatio[]): ProdiRatioCounts {
  const dlbTetap = { dlb: 0, tetap: 0 };
  const pendidikan = { s2: 0, s3: 0, sedangS3: 0 };
  const jfa: Record<JfaGroup, number> = { AA: 0, L: 0, LK: 0, GB: 0, NJFA: 0 };

  for (const d of dosenList) {
    if (d.jenis === "DLB") {
      dlbTetap.dlb += 1;
      continue;
    }
    dlbTetap.tetap += 1;
    if (d.tingkatPendidikan === "S2") pendidikan.s2 += 1;
    else if (d.tingkatPendidikan === "S3") pendidikan.s3 += 1;
    else if (d.tingkatPendidikan === "ON_GOING_S3") pendidikan.sedangS3 += 1;
    jfa[classifyJfaGroup(d.jfa)] += 1;
  }

  return { totalDosen: dosenList.length, dlbTetap, pendidikan, jfa };
}
