import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { PRODI_SHEET_MAPPING } from "./prodiMapping";
import type { ImportReport, ImportWarning } from "./types";

const BLOCK_HEADER_RE = /^Semester\s+(\d+)\s*\|\s*Tahun Angkatan\s*(\d+)/i;

function cell(row: unknown[] | undefined, i: number): string | null {
  if (!row) return null;
  const v = row[i];
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

async function importBebanStruktural(
  wb: XLSX.WorkBook,
  warnings: ImportWarning[],
): Promise<number> {
  const ws = wb.Sheets["Beban Dosen"];
  if (!ws) {
    warnings.push({
      level: "warning",
      message: 'Sheet "Beban Dosen" not found; beban struktural was not imported',
    });
    return 0;
  }

  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: false,
    defval: null,
  });

  const dosenList = await prisma.dosen.findMany({ select: { id: true, kode: true } });
  const dosenByKode = new Map(dosenList.map((d) => [d.kode, d.id]));

  const updates: { id: string; bebanStruktural: string | null }[] = [];
  const seenKode = new Set<string>();

  for (const row of rows) {
    // Genuine data rows have a sequential "No" in col 0. This sheet also
    // contains an unrelated recap-style table further down (col 0 blank,
    // category labels like "DTPR"/"Rasio" sitting in the kode column) that
    // would otherwise be misread as dosen rows.
    const no = cell(row, 0);
    if (!no || !/^\d+$/.test(no)) continue;

    const kode = cell(row, 5)?.toUpperCase() ?? null;
    if (!kode || !/^[A-Z]{2,6}$/.test(kode)) continue;
    if (seenKode.has(kode)) continue;
    seenKode.add(kode);

    const dosenId = dosenByKode.get(kode);
    if (!dosenId) {
      warnings.push({
        level: "warning",
        message: `Unknown dosen kode "${kode}" in "Beban Dosen" sheet (expected to already exist from the dosen master import)`,
      });
      continue;
    }
    updates.push({ id: dosenId, bebanStruktural: cell(row, 7) });
  }

  await prisma.$transaction(
    async (tx) => {
      for (const u of updates) {
        await tx.dosen.update({
          where: { id: u.id },
          data: { bebanStruktural: u.bebanStruktural },
        });
      }
    },
    { timeout: 120_000 },
  );

  return updates.length;
}

type ResolvedPair = { col: number; sectionSuffix: string; kodeKelas: string; prefix: string };

type ParsedKelas = {
  sectionSuffix: string;
  kodeKelas: string;
  sks: number;
  dosenKode: string;
};

type ParsedCourseRow = {
  kodeMK: string;
  nama: string;
  sks: number;
  ket: string | null;
  kelas: ParsedKelas[];
};

type ParsedBlock = {
  semesterKe: number;
  tahunAngkatan: number;
  kelasPrefix: string;
  courses: ParsedCourseRow[];
};

// Strips trailing human annotations like "(reg)" / "(mbkm)" seen in some sheets.
function cleanSuffixLabel(raw: string): string {
  return raw.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

// The source sheets are inconsistent: some section header cells already hold
// a full kelas code (e.g. "S1SI-06-A"), others hold a bare suffix (e.g. "01")
// that must be combined with a prefix parsed from the block's "Pengampu ...
// kelas <PREFIX>" label. Decide per-pair from the cell's own content.
function resolvePair(
  col: number,
  rawLabel: string,
  labelPrefix: string,
  fallbackPrefix: string,
): ResolvedPair {
  const cleaned = cleanSuffixLabel(rawLabel);
  const lastDash = cleaned.lastIndexOf("-");
  if (lastDash > 0) {
    return {
      col,
      sectionSuffix: cleaned.slice(lastDash + 1),
      kodeKelas: cleaned,
      prefix: cleaned.slice(0, lastDash + 1),
    };
  }
  const prefix = labelPrefix
    ? labelPrefix.endsWith("-")
      ? labelPrefix
      : `${labelPrefix}-`
    : fallbackPrefix;
  return { col, sectionSuffix: cleaned, kodeKelas: `${prefix}${cleaned}`, prefix };
}

export function parseSheetBlocks(
  sheetName: string,
  rows: unknown[][],
  warnings: ImportWarning[],
): ParsedBlock[] {
  const blockStarts: { rowIndex: number; semesterKe: number; tahunAngkatan: number }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const c0 = cell(rows[i], 0);
    if (!c0) continue;
    const m = c0.match(BLOCK_HEADER_RE);
    if (m) {
      blockStarts.push({ rowIndex: i, semesterKe: Number(m[1]), tahunAngkatan: Number(m[2]) });
    }
  }

  if (blockStarts.length === 0) {
    warnings.push({
      level: "warning",
      message: `No "Semester N | Tahun Angkatan YYYY" blocks found`,
      context: `Sheet ${sheetName}`,
    });
    return [];
  }

  const blocks: ParsedBlock[] = [];

  for (let b = 0; b < blockStarts.length; b++) {
    const { rowIndex, semesterKe, tahunAngkatan } = blockStarts[b];
    const blockLabel = `Semester ${semesterKe} | Tahun Angkatan ${tahunAngkatan}`;
    const headerRow = rows[rowIndex];
    const fallbackPrefix = `${sheetName}-${semesterKe}-${tahunAngkatan}-`;

    // Best-effort prefix from the "Pengampu (kode Dosen) kelas <PREFIX>" label,
    // used only for pairs whose header cell is a bare suffix (no "-"). Some
    // sheets omit "Pengampu" entirely, or omit the "kelas <PREFIX>" suffix.
    let labelPrefix = "";
    for (let c = 1; c < headerRow.length; c++) {
      const text = cell(headerRow, c);
      if (text && /pengampu/i.test(text)) {
        const m = text.match(/kelas\s+(.+)$/i);
        if (m) labelPrefix = m[1].trim();
        break;
      }
    }

    // Section pairs always start at column 5 (No.|Kode MK|Nama MK|sks|Ket|<pairs>)
    // — consistent across every per-prodi sheet, even when there's no "Pengampu" label.
    const sectionHeaderRow = rows[rowIndex + 1];
    const rawPairs: { col: number; label: string }[] = [];
    for (let col = 5; ; col += 2) {
      const suffixCell = cell(sectionHeaderRow, col);
      const sksCell = cell(sectionHeaderRow, col + 1);
      if (!suffixCell && !sksCell) break;
      rawPairs.push({ col, label: suffixCell ?? String(rawPairs.length + 1).padStart(2, "0") });
    }

    if (rawPairs.length === 0) {
      warnings.push({
        level: "warning",
        message: `No section columns found for block "${blockLabel}"`,
        context: `Sheet ${sheetName}`,
      });
      continue;
    }

    const pairs = rawPairs.map((p) => resolvePair(p.col, p.label, labelPrefix, fallbackPrefix));

    // Two header columns occasionally share the same literal suffix label
    // (e.g. two columns both labeled "S1TI-08-A"). Left alone, both pairs
    // would resolve to the same sectionSuffix and silently collapse into a
    // single Kelas row — losing one column's dosen/sks entirely. Disambiguate
    // every repeat so each column keeps its own Kelas row.
    const seenSuffix = new Map<string, number>();
    for (const p of pairs) {
      const occurrence = (seenSuffix.get(p.sectionSuffix) ?? 0) + 1;
      seenSuffix.set(p.sectionSuffix, occurrence);
      if (occurrence > 1) {
        warnings.push({
          level: "warning",
          message: `Duplicate section suffix "${p.sectionSuffix}" in block "${blockLabel}" — disambiguated to avoid overwriting the earlier column`,
          context: `Sheet ${sheetName}`,
        });
        p.sectionSuffix = `${p.sectionSuffix}~${occurrence}`;
        p.kodeKelas = `${p.kodeKelas}~${occurrence}`;
      }
    }

    const kelasPrefix = pairs[0].prefix;

    const dataStart = rowIndex + 2;
    const dataEnd = b + 1 < blockStarts.length ? blockStarts[b + 1].rowIndex : rows.length;

    const courses: ParsedCourseRow[] = [];
    const FOOTER_LABEL_RE = /^(jumlah sks per kelas|jumlah kelas|total sks)$/i;

    // Some sheets reuse a single generic Kode MK (e.g. MBKM placeholder
    // codes) across multiple distinct activities within one block — "Magang
    // 1" and "Magang 2" both under "UHKXAEB5". They'd otherwise collapse
    // into one CourseOffering and silently drop one occurrence's sections
    // (same sectionSuffix => same Kelas row). Disambiguate repeats here.
    const kodeMkOccurrence = new Map<string, number>();

    for (let r = dataStart; r < dataEnd; r++) {
      const row = rows[r];

      // A per-block totals footer marks the end of real course rows. What
      // follows (until the next block) is unrelated content some sheets
      // append below it, e.g. a "Dosen Luar Biasa" roster — not plotting data.
      const c0 = cell(row, 0);
      if (c0 && FOOTER_LABEL_RE.test(c0.trim())) break;

      const kodeMK = cell(row, 1);
      if (!kodeMK) continue; // blank padding row or a category sub-header label

      // Some sheets place a category sub-header (e.g. "Pilihan MBKM") in the
      // Kode MK column instead of column 0. Real course codes are always a
      // compact alphanumeric token with no spaces.
      if (kodeMK.includes(" ")) {
        warnings.push({
          level: "warning",
          message: `Skipped row with non-code Kode MK "${kodeMK}" (likely a category label, not a course)`,
          context: `Sheet ${sheetName} row ${r + 1}`,
        });
        continue;
      }

      const nama = cell(row, 2) ?? "";
      const ket = cell(row, 4);
      const sksRaw = cell(row, 3);
      let baseSks = sksRaw !== null ? Number(sksRaw) : NaN;

      const kelas: ParsedKelas[] = [];
      for (const pair of pairs) {
        const dosenKode = cell(row, pair.col)?.toUpperCase() ?? null;
        if (!dosenKode) continue; // blank dosen cell = section not offered

        // A blank section-sks cell is a deliberate "0 SKS credited" marker in
        // the source data (confirmed against the workbook's own Beban Dosen
        // totals) — e.g. Kerja Praktik supervision often isn't credited
        // per-section even though a dosen is assigned. Only a genuinely
        // unparseable (non-blank) value is treated as an error.
        const sectionSksRaw = cell(row, pair.col + 1);
        let sectionSks = 0;
        if (sectionSksRaw !== null) {
          sectionSks = Number(sectionSksRaw);
          if (Number.isNaN(sectionSks)) {
            warnings.push({
              level: "warning",
              message: `Unparseable section sks "${sectionSksRaw}" for ${kodeMK} section ${pair.sectionSuffix}; section skipped`,
              context: `Sheet ${sheetName} row ${r + 1}`,
            });
            continue;
          }
        }

        kelas.push({
          sectionSuffix: pair.sectionSuffix,
          kodeKelas: pair.kodeKelas,
          sks: sectionSks,
          dosenKode,
        });
      }

      const occurrence = (kodeMkOccurrence.get(kodeMK) ?? 0) + 1;
      kodeMkOccurrence.set(kodeMK, occurrence);
      if (occurrence > 1) {
        warnings.push({
          level: "warning",
          message: `Kode MK ${kodeMK} repeats within this block (occurrence ${occurrence}, "${nama}"); sections disambiguated to avoid overwriting the earlier occurrence`,
          context: `Sheet ${sheetName} row ${r + 1}`,
        });
        for (const k of kelas) {
          k.sectionSuffix = `${k.sectionSuffix}~${occurrence}`;
          k.kodeKelas = `${k.kodeKelas}~${occurrence}`;
        }
      }

      if (Number.isNaN(baseSks)) {
        if (kelas.length > 0) {
          baseSks = kelas[0].sks; // base sks blank; fall back to a section's sks
          warnings.push({
            level: "warning",
            message: `Mata Kuliah ${kodeMK} has no base sks; using section sks (${baseSks}) instead`,
            context: `Sheet ${sheetName} row ${r + 1}`,
          });
        } else {
          warnings.push({
            level: "warning",
            message: `Unparseable sks "${sksRaw}" for Kode MK ${kodeMK}; row skipped`,
            context: `Sheet ${sheetName} row ${r + 1}`,
          });
          continue;
        }
      }

      courses.push({ kodeMK, nama, sks: baseSks, ket, kelas });
    }

    blocks.push({ semesterKe, tahunAngkatan, kelasPrefix, courses });
  }

  return blocks;
}

async function importPlottingSheets(
  wb: XLSX.WorkBook,
  warnings: ImportWarning[],
  counts: Record<string, number>,
) {
  const activePeriode = await prisma.semesterPeriode.findFirst({ where: { aktif: true } });
  if (!activePeriode) {
    throw new Error("No active SemesterPeriode configured; seed or activate one before importing");
  }

  const [programStudiList, dosenList, existingMataKuliah, existingOfferings, existingKelas] =
    await Promise.all([
      prisma.programStudi.findMany(),
      prisma.dosen.findMany({ select: { id: true, kode: true } }),
      prisma.mataKuliah.findMany({ select: { kodeMK: true, prodiId: true } }),
      prisma.courseOffering.findMany({
        where: { semesterPeriodeId: activePeriode.id },
        select: { mataKuliahId: true, kelasPrefix: true },
      }),
      prisma.kelas.findMany({
        where: { semesterPeriodeId: activePeriode.id },
        select: { courseOfferingId: true, sectionSuffix: true },
      }),
    ]);
  const prodiByKode = new Map(programStudiList.map((p) => [p.kode, p]));
  const dosenByKode = new Map(dosenList.map((d) => [d.kode, d.id]));
  const unknownDosenWarned = new Set<string>();

  // Snapshots of existing keys, used to report created-vs-updated counts.
  // Mutated as we go so a kodeMK repeated across two blocks in this same run
  // is only counted as "created" once. Offerings/Kelas are scoped to the
  // active period — the same mataKuliahId+kelasPrefix legitimately exists in
  // other semesters without colliding here.
  const mkKeySet = new Set(existingMataKuliah.map((m) => `${m.prodiId}|${m.kodeMK}`));
  const offeringKeySet = new Set(
    existingOfferings.map((o) => `${o.mataKuliahId}|${o.kelasPrefix}`),
  );
  const kelasKeySet = new Set(
    existingKelas.map((k) => `${k.courseOfferingId}|${k.sectionSuffix}`),
  );

  function bump(key: string) {
    counts[key] = (counts[key] ?? 0) + 1;
  }

  for (const [sheetName, prodiKode] of Object.entries(PRODI_SHEET_MAPPING)) {
    const ws = wb.Sheets[sheetName];
    if (!ws) {
      warnings.push({
        level: "warning",
        message: `Sheet "${sheetName}" not found in plotting workbook`,
      });
      continue;
    }

    const prodi = prodiByKode.get(prodiKode);
    if (!prodi) {
      warnings.push({
        level: "error",
        message: `ProgramStudi with kode "${prodiKode}" not found (sheet "${sheetName}")`,
      });
      continue;
    }

    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      raw: false,
      defval: null,
    });

    const blocks = parseSheetBlocks(sheetName, rows, warnings);

    // One transaction per sheet: atomic per prodi, without holding a single
    // connection for the entire multi-sheet workbook.
    await prisma.$transaction(async (tx) => {
      for (const block of blocks) {
        for (const course of block.courses) {
          const mkKey = `${prodi.id}|${course.kodeMK}`;
          const mkExisted = mkKeySet.has(mkKey);
          mkKeySet.add(mkKey);
          bump(mkExisted ? "mataKuliahUpdated" : "mataKuliahCreated");

          const mataKuliah = await tx.mataKuliah.upsert({
            where: { kodeMK_prodiId: { kodeMK: course.kodeMK, prodiId: prodi.id } },
            update: { nama: course.nama, sks: course.sks, ket: course.ket },
            create: {
              kodeMK: course.kodeMK,
              nama: course.nama,
              sks: course.sks,
              ket: course.ket,
              prodiId: prodi.id,
            },
          });

          const offeringKey = `${mataKuliah.id}|${block.kelasPrefix}`;
          const offeringExisted = offeringKeySet.has(offeringKey);
          offeringKeySet.add(offeringKey);
          bump(offeringExisted ? "courseOfferingUpdated" : "courseOfferingCreated");

          const courseOffering = await tx.courseOffering.upsert({
            where: {
              semesterPeriodeId_mataKuliahId_kelasPrefix: {
                semesterPeriodeId: activePeriode.id,
                mataKuliahId: mataKuliah.id,
                kelasPrefix: block.kelasPrefix,
              },
            },
            update: { semesterKe: block.semesterKe, tahunAngkatan: block.tahunAngkatan },
            create: {
              mataKuliahId: mataKuliah.id,
              semesterPeriodeId: activePeriode.id,
              semesterKe: block.semesterKe,
              tahunAngkatan: block.tahunAngkatan,
              prodiId: prodi.id,
              kelasPrefix: block.kelasPrefix,
            },
          });

          for (const k of course.kelas) {
            const dosenId = dosenByKode.get(k.dosenKode);
            if (!dosenId) {
              const warnKey = `${sheetName}:${k.dosenKode}`;
              if (!unknownDosenWarned.has(warnKey)) {
                unknownDosenWarned.add(warnKey);
                warnings.push({
                  level: "warning",
                  message: `Unknown dosen kode "${k.dosenKode}" for ${k.kodeKelas} (expected to already exist from the dosen master import)`,
                  context: `Sheet ${sheetName}`,
                });
              }
              continue;
            }

            const kelasKey = `${courseOffering.id}|${k.sectionSuffix}`;
            const kelasExisted = kelasKeySet.has(kelasKey);
            kelasKeySet.add(kelasKey);
            bump(kelasExisted ? "kelasUpdated" : "kelasCreated");

            await tx.kelas.upsert({
              where: {
                courseOfferingId_sectionSuffix: {
                  courseOfferingId: courseOffering.id,
                  sectionSuffix: k.sectionSuffix,
                },
              },
              update: { kodeKelas: k.kodeKelas, sks: k.sks, dosenId },
              create: {
                courseOfferingId: courseOffering.id,
                semesterPeriodeId: activePeriode.id,
                kodeKelas: k.kodeKelas,
                sectionSuffix: k.sectionSuffix,
                sks: k.sks,
                dosenId,
              },
            });
          }
        }
      }
    }, { timeout: 120_000 });
  }
}

export async function importPlottingWorkbook(buffer: Buffer): Promise<ImportReport> {
  const warnings: ImportWarning[] = [];
  const counts: Record<string, number> = {};

  const wb = XLSX.read(buffer, { type: "buffer" });

  counts.dosenBebanStrukturalUpdated = await importBebanStruktural(wb, warnings);
  await importPlottingSheets(wb, warnings, counts);

  return { counts, warnings };
}

export type { ParsedBlock, ParsedCourseRow, ParsedKelas };
