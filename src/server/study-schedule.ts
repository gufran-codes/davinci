import { randomUUID } from "node:crypto";
import {
  studyScheduleSchema,
  type StudyScheduleEntry,
} from "../lib/study-schedule";
import { gradeSkills } from "../lib/curriculum-catalog";
import { all, run, transaction } from "./db";
import { HttpError, ownedChild } from "./repository";

export function studyScheduleFor(
  parentId: string,
  childId: string,
): StudyScheduleEntry[] {
  ownedChild(parentId, childId);
  return all<StudyScheduleEntry>(
    "SELECT id,subject,starts_at AS startsAt,duration_minutes AS durationMinutes FROM study_schedule WHERE child_id=? AND status='planned' ORDER BY starts_at",
    childId,
  ).map((entry) => ({ ...entry }));
}
export function scheduleStudy(
  parentId: string,
  childId: string,
  input: unknown,
  now = new Date(),
) {
  const child = ownedChild(parentId, childId),
    data = studyScheduleSchema.parse(input);
  if (
    !(child.subjects ?? ["Math"]).includes(data.subject) ||
    !gradeSkills(child.grade, data.subject).length
  )
    throw new HttpError(
      400,
      "Choose an available subject from your learning settings.",
    );
  const starts = Date.parse(data.startsAt);
  if (starts <= now.getTime() || starts > now.getTime() + 366 * 86400000)
    throw new HttpError(400, "Choose a future time within the next year.");
  return transaction(() => {
    const entries = studyScheduleFor(parentId, childId);
    if (
      entries.filter((entry) => Date.parse(entry.startsAt) > now.getTime())
        .length >= 50
    )
      throw new HttpError(400, "You already have 50 upcoming study times.");
    if (
      entries.some(
        (entry) =>
          starts < Date.parse(entry.startsAt) + entry.durationMinutes * 60000 &&
          starts + data.durationMinutes * 60000 > Date.parse(entry.startsAt),
      )
    )
      throw new HttpError(
        409,
        "You already have a study time then. Choose another time.",
      );
    const entry = {
      id: randomUUID(),
      ...data,
      startsAt: new Date(starts).toISOString(),
    };
    run(
      "INSERT INTO study_schedule(id,child_id,subject,starts_at,duration_minutes,status,created_at) VALUES(?,?,?,?,?,'planned',?)",
      entry.id,
      childId,
      entry.subject,
      entry.startsAt,
      entry.durationMinutes,
      now.toISOString(),
    );
    return entry;
  });
}
export function cancelStudy(parentId: string, childId: string, id: string) {
  ownedChild(parentId, childId);
  run(
    "UPDATE study_schedule SET status='cancelled' WHERE id=? AND child_id=?",
    id,
    childId,
  );
}
