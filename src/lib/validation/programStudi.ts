import { z } from "zod";

export const jenjangSchema = z.enum(["S1", "D3"]);

export const createProgramStudiSchema = z.object({
  kode: z.string().min(1).max(20),
  nama: z.string().min(1),
  jenjang: jenjangSchema,
});

export const updateProgramStudiSchema = z.object({
  kode: z.string().min(1).max(20).optional(),
  nama: z.string().min(1).optional(),
  jenjang: jenjangSchema.optional(),
  aktif: z.boolean().optional(),
});
