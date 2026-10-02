import type { Subject } from "./types";

export const studentSubjects: {
  subject: Subject;
  slug: string;
  description: string;
}[] = [
  {
    subject: "Math",
    slug: "math",
    description: "Find patterns. Make connections.",
  },
  {
    subject: "English",
    slug: "english",
    description: "Read closely. Find your words.",
  },
  { subject: "Science", slug: "science", description: "Ask why. Explore how." },
  {
    subject: "Social Studies",
    slug: "social-studies",
    description: "Discover people, places, and ideas.",
  },
];

export function subjectSlug(subject: Subject) {
  return studentSubjects.find((item) => item.subject === subject)!.slug;
}

export interface StudentSkillCard {
  id: string;
  name: string;
  description: string;
  domain: string;
  level: string;
}

export function filterStudentSkills(skills: StudentSkillCard[], query: string) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return skills.filter((skill) =>
    words.every((word) =>
      `${skill.name} ${skill.description} ${skill.domain}`
        .toLowerCase()
        .includes(word),
    ),
  );
}
