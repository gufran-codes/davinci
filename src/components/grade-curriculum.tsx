import type { Subject } from "@/lib/types";
import { gradeSkills, curriculumSubjects } from "@/lib/curriculum-catalog";
import { StartLesson } from "./child-experience";
export function GradeCurriculum({
  grade,
  childId,
  subjects,
}: {
  grade: number;
  childId: string;
  subjects?: Subject[];
}) {
  return (
    <section className="card spaced">
      <h2>Grade {grade} curriculum</h2>
      <p>
        Choose a subject, then an idea to explore. Your tutor can review a
        foundation when you need it.
      </p>
      {curriculumSubjects
        .filter((subject) => (subjects ?? curriculumSubjects).includes(subject))
        .map((subject) => {
          const skills = gradeSkills(grade, subject),
            domains = [...new Set(skills.map((s) => s.domain))];
          return (
            <details key={subject} className="spaced">
              <summary>
                {subject} · {skills.length} skills
              </summary>
              {domains.map((domain) => (
                <details key={domain} className="spaced">
                  <summary>{domain}</summary>
                  {skills
                    .filter((s) => s.domain === domain)
                    .map((skill) => (
                      <div className="spaced" key={skill.id}>
                        <strong>{skill.name}</strong>
                        <p>{skill.description}</p>
                        <StartLesson
                          childId={childId}
                          conceptId={skill.id}
                          subject={subject}
                          label={`Learn ${skill.name}`}
                        />
                      </div>
                    ))}
                </details>
              ))}
            </details>
          );
        })}
    </section>
  );
}
