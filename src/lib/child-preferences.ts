import { z } from "zod";
export const childPreferencesSchema = z.object({
  grade: z.number().int().min(1).max(10),
  subjects: z
    .array(z.enum(["Math", "English", "Science", "Social Studies"]))
    .min(1)
    .max(4)
    .transform((values) => [...new Set(values)]),
});
