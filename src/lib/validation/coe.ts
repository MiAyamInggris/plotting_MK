import { z } from "zod";

export const createCoeSchema = z.object({
  nama: z.string().min(1),
});

export const updateCoeSchema = z.object({
  nama: z.string().min(1).optional(),
});
