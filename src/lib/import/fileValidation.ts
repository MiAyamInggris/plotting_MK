const MAX_IMPORT_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function validateImportFile(file: File): string | null {
  if (file.size === 0) return "File is empty";
  if (file.size > MAX_IMPORT_FILE_SIZE) return "File exceeds the 20MB limit";
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
    return "Only .xlsx or .xls files are accepted";
  }
  return null;
}
