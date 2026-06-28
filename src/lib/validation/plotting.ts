import { z } from "zod";

export const assignDosenSchema = z.object({
  dosenId: z.string().nullable(),
});

export const createKelasSchema = z.object({
  courseOfferingId: z.string().min(1),
  sectionSuffix: z.string().min(1),
});

export const updateKelasSchema = z.object({
  sectionSuffix: z.string().min(1),
});
