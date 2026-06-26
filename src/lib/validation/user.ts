import { z } from "zod";

export const userRoleSchema = z.enum(["ADMIN", "KAPRODI", "KETUA_KK", "DOSEN"]);

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
  role: userRoleSchema.optional(),
  prodiId: z.string().nullable().optional(),
  kkId: z.string().nullable().optional(),
  aktif: z.boolean().optional(),
});
