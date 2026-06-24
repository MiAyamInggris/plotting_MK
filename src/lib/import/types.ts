export type ImportWarning = {
  level: "warning" | "error";
  message: string;
  context?: string;
};

export type ImportReport = {
  counts: Record<string, number>;
  warnings: ImportWarning[];
};
