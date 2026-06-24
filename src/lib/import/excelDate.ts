const MONTH_NAMES: Record<string, number> = {
  january: 1,
  januari: 1,
  february: 2,
  februari: 2,
  march: 3,
  maret: 3,
  april: 4,
  may: 5,
  mei: 5,
  june: 6,
  juni: 6,
  july: 7,
  juli: 7,
  august: 8,
  agustus: 8,
  september: 9,
  october: 10,
  oktober: 10,
  november: 11,
  december: 12,
  desember: 12,
};

// "-" is used in the source sheets as an explicit "not applicable" marker,
// not a data error, so callers should treat it as a silent null.
export function isBlankDateMarker(value: string | null | undefined): boolean {
  return value?.trim() === "-";
}

// The source workbooks mostly render dates as "DD/MM/YYYY" (Indonesian
// convention), but a handful of rows use free text like "1 July 2023" or
// "1 Oktober 2023" (English/Indonesian month names mixed).
export function parseFlexibleDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-") return null;

  const numeric = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    const year = Number(numeric[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return new Date(Date.UTC(year, month - 1, day));
  }

  const textual = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (textual) {
    const day = Number(textual[1]);
    const month = MONTH_NAMES[textual[2].toLowerCase()];
    const year = Number(textual[3]);
    if (!month || day < 1 || day > 31) return null;
    return new Date(Date.UTC(year, month - 1, day));
  }

  return null;
}
