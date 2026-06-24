import { z } from "zod";

export const setProdiTargetSchema = z.object({
  prodiId: z.string().min(1),
  kebutuhanSks: z.coerce.number().nonnegative(),
});
