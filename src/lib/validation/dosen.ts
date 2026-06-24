import { z } from "zod";

export const jfaSchema = z.enum([
  "Asisten Ahli (150)",
  "Lektor (200)",
  "Lektor (300)",
  "Lektor Kepala (400)",
  "Lektor Kepala (550)",
  "NJFA",
]);

export const tingkatPendidikanSchema = z.enum(["S2", "S3", "ON_GOING_S3"]);

export const createDosenSchema = z.object({
  kode: z
    .string()
    .min(1)
    .max(10)
    .transform((v) => v.toUpperCase()),
  nama: z.string().min(1),
  namaTanpaGelar: z.string().min(1),
  nipYpt: z.string().nullable().optional(),
  nidn: z.string().nullable().optional(),
  jfa: jfaSchema.nullable().optional(),
  tmtJfa: z.string().nullable().optional(),
  homebaseProdiId: z.string().nullable().optional(),
  tingkatPendidikan: tingkatPendidikanSchema.nullable().optional(),
  kkId: z.string().nullable().optional(),
  coeId: z.string().nullable().optional(),
  bebanStruktural: z.string().nullable().optional(),
});

export const updateDosenSchema = createDosenSchema.partial().extend({
  aktif: z.boolean().optional(),
});
