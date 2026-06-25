const MAX_IMPORT_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const DEFAULT_EXTENSIONS = [".xlsx", ".xls"];

export function validateImportFile(
  file: File,
  extraExtensions: string[] = [],
): string | null {
  if (file.size === 0) return "File is empty";
  if (file.size > MAX_IMPORT_FILE_SIZE) return "File exceeds the 20MB limit";
  const extensions = [...DEFAULT_EXTENSIONS, ...extraExtensions];
  const name = file.name.toLowerCase();
  if (!extensions.some((ext) => name.endsWith(ext))) {
    return `Only ${extensions.join(", ")} files are accepted`;
  }
  return null;
}
