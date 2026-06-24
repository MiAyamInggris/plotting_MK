import { z } from "zod";

export const createMataKuliahSchema = z.object({
  kodeMK: z.string().min(1),
  nama: z.string().min(1),
  sks: z.coerce.number().positive(),
  prodiId: z.string().min(1),
  ket: z.string().nullable().optional(),
});

export const updateMataKuliahSchema = z.object({
  kodeMK: z.string().min(1).optional(),
  nama: z.string().min(1).optional(),
  sks: z.coerce.number().positive().optional(),
  ket: z.string().nullable().optional(),
});

export const createCourseOfferingSchema = z.object({
  mataKuliahId: z.string().min(1),
  semesterKe: z.coerce.number().int().positive(),
  tahunAngkatan: z.coerce.number().int().positive(),
  kelasPrefix: z.string().min(1),
});

export const updateCourseOfferingSchema = z.object({
  semesterKe: z.coerce.number().int().positive().optional(),
  tahunAngkatan: z.coerce.number().int().positive().optional(),
  kelasPrefix: z.string().min(1).optional(),
});
