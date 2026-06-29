import { z } from "zod";
import { IMPERSONATABLE_ROLES } from "@/lib/impersonation";

export const startImpersonationSchema = z.object({
  role: z.enum(IMPERSONATABLE_ROLES),
  prodiId: z.string().nullable().optional(),
  kkId: z.string().nullable().optional(),
});
