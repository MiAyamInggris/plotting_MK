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

export const dosenJenisSchema = z.enum(["TETAP", "DLB"]);

// DLB (Dosen Luar Biasa) have their own mandatory attribute set, distinct
// from the tetap-only fields (homebase prodi, NIP YPT) in createDosenSchema
// below -- they're external, so kode/email/nidn/noTelp/jfa/homebaseUniv are
// all entered directly by the registering Ketua KK, not inherited from a
// homebase import.
export const registerDlbSchema = z.object({
  kode: z
    .string()
    .min(1)
    .max(10)
    .transform((v) => v.toUpperCase()),
  nama: z.string().min(1),
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase()),
  nidn: z.string().min(1),
  noTelp: z.string().min(1),
  jfa: jfaSchema,
  homebaseUniv: z.string().min(1),
  kkId: z.string().nullable().optional(),
});

export const createDosenSchema = z.object({
  kode: z
    .string()
    .min(1)
    .max(10)
    .transform((v) => v.toUpperCase()),
  nama: z.string().min(1),
  namaTanpaGelar: z.string().min(1).optional(),
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase())
    .nullable()
    .optional(),
  nipYpt: z.string().nullable().optional(),
  nidn: z.string().nullable().optional(),
  jfa: jfaSchema.nullable().optional(),
  tmtJfa: z.string().nullable().optional(),
  homebaseProdiId: z.string().nullable().optional(),
  tingkatPendidikan: tingkatPendidikanSchema.nullable().optional(),
  kkId: z.string().nullable().optional(),
  coeId: z.string().nullable().optional(),
  bebanStruktural: z.string().nullable().optional(),
  bebanStrukturalSks: z.coerce.number().nonnegative().nullable().optional(),
  noTelp: z.string().nullable().optional(),
  homebaseUniv: z.string().nullable().optional(),
  jenis: dosenJenisSchema.optional(),
});

export const updateDosenSchema = createDosenSchema.partial().extend({
  aktif: z.boolean().optional(),
});
