import { z } from "zod";
export const studyScheduleSchema = z.object({
  subject: z.enum(["Math", "English", "Science", "Social Studies"]),
  startsAt: z.iso.datetime(),
  durationMinutes: z.union([
    z.literal(10),
    z.literal(15),
    z.literal(20),
    z.literal(30),
  ]),
});
export interface StudyScheduleEntry {
  id: string;
  subject: "Math" | "English" | "Science" | "Social Studies";
  startsAt: string;
  durationMinutes: number;
}
