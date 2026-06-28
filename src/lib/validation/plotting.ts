import { z } from "zod";

export const assignDosenSchema = z.object({
  dosenId: z.string().nullable(),
});

export const updateKelasSchema = z.object({
  kodeKelas: z.string().min(1),
});
