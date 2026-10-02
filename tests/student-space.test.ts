import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { filterStudentSkills, subjectSlug } from "../src/lib/student-space";
process.env.DATABASE_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "davinci-space-")),
  "test.sqlite",
);
const { register } = await import("../src/server/auth");
const { createChild, updateChildPreferences } =
  await import("../src/server/repository");
const { studyScheduleFor, scheduleStudy, cancelStudy } =
  await import("../src/server/study-schedule");
const { one, run } = await import("../src/server/db");
const parent = register("Space", "space@test.local", "safe-password-123");
const outsider = register("Other", "outside@test.local", "safe-password-123");
const now = new Date("2026-09-30T12:00:00.000Z");
const booking = {
  subject: "Math",
  startsAt: "2026-10-01T12:00:00.000Z",
  durationMinutes: 15,
};
function child() {
  return createChild(parent.id, {
    nickname: "Maya",
    age: 9,
    grade: 4,
    subjects: ["Math"],
    goal: "Fill learning gaps",
  });
}

test("study times persist, normalize UTC and remain isolated by child", () => {
  const a = child(),
    b = child();
  const item = scheduleStudy(parent.id, a.id, booking, now);
  assert.deepEqual(studyScheduleFor(parent.id, a.id), [item]);
  assert.deepEqual(studyScheduleFor(parent.id, b.id), []);
  assert.equal(
    one<{ child_id: string }>(
      "SELECT child_id FROM study_schedule WHERE id=?",
      item.id,
    )?.child_id,
    a.id,
  );
});
test("schedule reads, writes and cancellations enforce ownership", () => {
  const a = child(),
    b = child();
  const item = scheduleStudy(parent.id, a.id, booking, now);
  assert.throws(() => studyScheduleFor(outsider.id, a.id));
  assert.throws(() => scheduleStudy(outsider.id, a.id, booking, now));
  assert.throws(() => cancelStudy(outsider.id, a.id, item.id));
  cancelStudy(parent.id, b.id, item.id);
  assert.equal(studyScheduleFor(parent.id, a.id).length, 1);
  cancelStudy(parent.id, a.id, item.id);
  assert.deepEqual(studyScheduleFor(parent.id, a.id), []);
});
test("reject overlapping, past and invalid study times; allow adjacent sessions", () => {
  const a = child();
  scheduleStudy(parent.id, a.id, booking, now);
  assert.throws(() => scheduleStudy(parent.id, a.id, booking, now), /already/);
  assert.throws(
    () =>
      scheduleStudy(
        parent.id,
        a.id,
        { ...booking, startsAt: "2026-10-01T12:10:00.000Z" },
        now,
      ),
    /already/,
  );
  scheduleStudy(
    parent.id,
    a.id,
    { ...booking, startsAt: "2026-10-01T12:15:00.000Z" },
    now,
  );
  assert.throws(
    () =>
      scheduleStudy(
        parent.id,
        a.id,
        { ...booking, startsAt: now.toISOString() },
        now,
      ),
    /future/,
  );
  assert.throws(() =>
    scheduleStudy(parent.id, a.id, { ...booking, startsAt: "bad" }, now),
  );
  assert.throws(() =>
    scheduleStudy(parent.id, a.id, { ...booking, durationMinutes: -1 }, now),
  );
});
test("only enabled subjects with available curriculum can be scheduled", () => {
  const a = child();
  assert.throws(
    () =>
      scheduleStudy(parent.id, a.id, { ...booking, subject: "Science" }, now),
    /available/,
  );
  updateChildPreferences(parent.id, a.id, { grade: 9, subjects: ["Math"] });
  assert.equal(scheduleStudy(parent.id, a.id, booking, now).subject, "Math");
});
test("schedule follows child deletion and does not leave orphan records", () => {
  const a = child(),
    item = scheduleStudy(parent.id, a.id, booking, now);
  run("DELETE FROM children WHERE id=?", a.id);
  assert.equal(
    one("SELECT id FROM study_schedule WHERE id=?", item.id),
    undefined,
  );
});
test("skill search considers topic and description and returns real matching records", () => {
  const skills = [
    {
      id: "a",
      name: "Equivalent fractions",
      description: "Equal parts",
      domain: "Fractions",
      level: "Starting",
    },
    {
      id: "b",
      name: "Times tables",
      description: "Equal groups",
      domain: "Multiplication",
      level: "Secure",
    },
  ];
  assert.deepEqual(
    filterStudentSkills(skills, "  FRACTIONS equal ").map((s) => s.id),
    ["a"],
  );
  assert.deepEqual(filterStudentSkills(skills, ""), skills);
  assert.deepEqual(filterStudentSkills(skills, "unknown"), []);
  assert.equal(subjectSlug("Social Studies"), "social-studies");
});
