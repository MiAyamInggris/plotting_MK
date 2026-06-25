import { z } from "zod";

export const semesterTipeSchema = z.enum(["GANJIL", "GENAP"]);

export const createSemesterPeriodeSchema = z.object({
  nama: z.string().min(1),
  tipe: semesterTipeSchema,
  tahunAjaran: z.string().min(1),
});

export const updateSemesterPeriodeSchema = z.object({
  nama: z.string().min(1).optional(),
  tipe: semesterTipeSchema.optional(),
  tahunAjaran: z.string().min(1).optional(),
  aktif: z.boolean().optional(),
  visibleToScopedRoles: z.boolean().optional(),
});
