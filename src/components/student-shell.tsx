"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  House,
  BookOpen,
  Calculator,
  FlaskConical,
  Globe2,
  History,
  Files,
  CalendarDays,
  SlidersHorizontal,
  ArrowUpRight,
  Menu,
  X,
} from "lucide-react";
import { Brand } from "./ui";
import type { Subject } from "@/lib/types";
import { studentSubjects } from "@/lib/student-space";
import styles from "./studio.module.css";

const icons = {
  Math: Calculator,
  English: BookOpen,
  Science: FlaskConical,
  "Social Studies": Globe2,
};
export function SubjectIcon({
  subject,
  size = 24,
}: {
  subject: Subject;
  size?: number;
}) {
  const Icon = icons[subject];
  return <Icon size={size} strokeWidth={1.5} aria-hidden="true" />;
}

export function StudentShell({
  child,
  children,
}: {
  child: { id: string; nickname: string; grade: number; subjects?: Subject[] };
  children: ReactNode;
}) {
  const pathname = usePathname(),
    [open, setOpen] = useState(false);
  const root = `/learn/${child.id}`,
    inLesson = pathname === `${root}/session`;
  const links = [
    { href: root, label: "My learning", icon: House },
    ...studentSubjects
      .filter((s) => (child.subjects ?? ["Math"]).includes(s.subject))
      .map((s) => ({
        href: `${root}/subjects/${s.slug}`,
        label: s.subject,
        icon: icons[s.subject],
      })),
    { href: `${root}/schedule`, label: "Study schedule", icon: CalendarDays },
    { href: `${root}/sessions`, label: "Past sessions", icon: History },
    { href: `${root}/uploads`, label: "My materials", icon: Files },
    {
      href: `${root}/settings`,
      label: "Grade & subjects",
      icon: SlidersHorizontal,
    },
  ];
  return (
    <div className={`${styles.shell} ${inLesson ? styles.lessonShell : ""}`}>
      <a className="skip-link" href="#student-main">
        Skip to learning
      </a>
      <header className={styles.mobileBar}>
        <Brand small />
        <button
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="student-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>
      <aside
        id="student-navigation"
        className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`}
      >
        <Brand />
        <p className={styles.spaceLabel}>YOUR LEARNING SPACE</p>
        <nav aria-label="Student navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={
                pathname === href ||
                (href !== root && pathname.startsWith(`${href}/`))
                  ? "page"
                  : undefined
              }
            >
              <Icon size={19} strokeWidth={1.6} />
              {label}
            </Link>
          ))}
        </nav>
        <div className={styles.sidebarFoot}>
          <p>
            A tutor that learns
            <br />
            <em>how to teach you.</em>
          </p>
          <Link
            href={`/app/children/${child.id}`}
            className={styles.parentLink}
          >
            Parent space <ArrowUpRight size={16} />
          </Link>
          <Link
            href={`${root}/settings`}
            onClick={() => setOpen(false)}
            className={styles.profile}
          >
            <span>{child.nickname[0]}</span>
            <div>
              <strong>{child.nickname}</strong>
              <small>Grade {child.grade}</small>
            </div>
          </Link>
        </div>
      </aside>
      <main id="student-main" className={styles.main}>
        {children}
      </main>
    </div>
  );
}
