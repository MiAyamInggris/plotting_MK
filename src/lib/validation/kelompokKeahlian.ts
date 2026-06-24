import { z } from "zod";

export const createKelompokKeahlianSchema = z.object({
  nama: z.string().min(1),
  kodeSingkat: z.string().nullable().optional(),
});

export const updateKelompokKeahlianSchema = z.object({
  nama: z.string().min(1).optional(),
  kodeSingkat: z.string().nullable().optional(),
});
