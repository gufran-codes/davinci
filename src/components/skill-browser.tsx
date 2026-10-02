"use client";

import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import type { Subject } from "@/lib/types";
import {
  filterStudentSkills,
  type StudentSkillCard,
} from "@/lib/student-space";
import { StartLesson } from "./child-experience";
import styles from "./studio.module.css";

export function SkillBrowser({
  childId,
  subject,
  skills,
  resume = false,
}: {
  childId: string;
  subject: Subject;
  skills: StudentSkillCard[];
  resume?: boolean;
}) {
  const [query, setQuery] = useState("");
  const visible = filterStudentSkills(skills, query),
    domains = [...new Set(visible.map((skill) => skill.domain))];
  return (
    <section
      className={styles.skillBrowser}
      aria-label={`${subject} skill map`}
    >
      <div className={styles.sectionHeading}>
        <h2>Your {subject} map</h2>
        <label className={styles.search}>
          <Search size={18} />
          <span className="sr-only">Search {subject} skills</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a topic or skill"
          />
        </label>
      </div>
      <p className={styles.quiet}>
        Start where you are. Da Vinci can revisit a foundation whenever you need
        it.
      </p>
      {resume && (
        <p className={styles.notice}>
          You have a saved lesson. Finish it before starting a different skill.
        </p>
      )}
      {!visible.length && (
        <div className={styles.empty}>
          <h3>
            {skills.length
              ? "No matching skills"
              : "This curriculum is on its way"}
          </h3>
          <p>
            {skills.length
              ? "Try another word or clear your search."
              : "Your learning history stays saved while we prepare these lessons."}
          </p>
          {query && (
            <button className="button secondary" onClick={() => setQuery("")}>
              Clear search
            </button>
          )}
        </div>
      )}
      {domains.map((domain) => (
        <section className={styles.domain} key={domain}>
          <h3>{domain}</h3>
          <div className={styles.skillGrid}>
            {visible
              .filter((skill) => skill.domain === domain)
              .map((skill) => (
                <details key={skill.id} className={styles.skillCard}>
                  <summary>
                    <span>{skill.name}</span>
                    <span className={styles.skillLevel}>{skill.level}</span>
                    <ArrowRight size={17} />
                  </summary>
                  <div>
                    <p>{skill.description}</p>
                    <StartLesson
                      childId={childId}
                      conceptId={skill.id}
                      subject={subject}
                      resume={resume}
                      label={
                        resume ? "Continue saved lesson" : `Learn ${skill.name}`
                      }
                    />
                  </div>
                </details>
              ))}
          </div>
        </section>
      ))}
    </section>
  );
}
