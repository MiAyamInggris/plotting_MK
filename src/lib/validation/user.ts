import { z } from "zod";

export const userRoleSchema = z.enum(["ADMIN", "KAPRODI", "KETUA_KK"]);

// Internal accounts may use single-label domains (e.g. "admin@local"), so a
// lenient "one @, no whitespace" check is used instead of Zod's RFC email().
const emailSchema = z
  .string()
  .regex(/^[^\s@]+@[^\s@]+$/, "Invalid email address");

export const createUserSchema = z
  .object({
    email: emailSchema,
    name: z.string().min(1),
    password: z.string().min(6),
    role: userRoleSchema,
    prodiId: z.string().nullable().optional(),
    kkId: z.string().nullable().optional(),
  })
  .refine((data) => data.role !== "KAPRODI" || !!data.prodiId, {
    message: "Kaprodi must be bound to a Program Studi",
    path: ["prodiId"],
  })
  .refine((data) => data.role !== "KETUA_KK" || !!data.kkId, {
    message: "Ketua KK must be bound to a Kelompok Keahlian",
    path: ["kkId"],
  });

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
  role: userRoleSchema.optional(),
  prodiId: z.string().nullable().optional(),
  kkId: z.string().nullable().optional(),
  aktif: z.boolean().optional(),
});
