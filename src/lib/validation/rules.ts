import { DEFAULT_SKS_CAP } from "@/lib/config";

export type RuleResult = {
  level: "error" | "warning";
  code: string;
  message: string;
  context?: Record<string, unknown>;
};

export function checkDosenActive(
  dosen: { kode: string; aktif: boolean } | null | undefined,
): RuleResult | null {
  if (dosen && !dosen.aktif) {
    return {
      level: "error",
      code: "DOSEN_INACTIVE",
      message: `Dosen ${dosen.kode} is not active`,
      context: { dosenKode: dosen.kode },
    };
  }
  return null;
}

export function checkSksCap(
  dosenKode: string,
  totalSksAfterAssignment: number,
  cap: number = DEFAULT_SKS_CAP,
): RuleResult | null {
  if (totalSksAfterAssignment > cap) {
    return {
      level: "warning",
      code: "SKS_CAP_EXCEEDED",
      message: `Dosen ${dosenKode} now teaches ${totalSksAfterAssignment} SKS, exceeding the ${cap} SKS cap`,
      context: { dosenKode, totalSks: totalSksAfterAssignment, cap },
    };
  }
  return null;
}

export function checkCrossProdi(
  dosenKode: string,
  dosenHomebaseProdiId: string | null | undefined,
  targetProdiId: string,
): RuleResult | null {
  if (dosenHomebaseProdiId && dosenHomebaseProdiId !== targetProdiId) {
    return {
      level: "warning",
      code: "CROSS_PRODI",
      message: `Dosen ${dosenKode} is teaching outside their homebase Program Studi`,
      context: { dosenKode, targetProdiId },
    };
  }
  return null;
}

export function checkSectionIntegrity(
  kodeKelas: string,
  kelasPrefix: string,
  sectionSuffix: string,
): RuleResult | null {
  if (kodeKelas !== `${kelasPrefix}${sectionSuffix}`) {
    return {
      level: "error",
      code: "SECTION_INTEGRITY",
      message: `kodeKelas "${kodeKelas}" does not match prefix "${kelasPrefix}" + suffix "${sectionSuffix}"`,
      context: { kodeKelas, kelasPrefix, sectionSuffix },
    };
  }
  return null;
}

export function checkEmptyCourse(
  kodeMK: string,
  totalSections: number,
): RuleResult | null {
  if (totalSections === 0) {
    return {
      level: "warning",
      code: "COURSE_NO_SECTIONS",
      message: `Mata Kuliah ${kodeMK} has zero plotted sections`,
      context: { kodeMK },
    };
  }
  return null;
}
