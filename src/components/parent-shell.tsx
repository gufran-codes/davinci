"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  House,
  Lightbulb,
  History,
  Users,
  Settings,
  ArrowUpRight,
  Sprout,
} from "lucide-react";
import { ReactNode, useEffect } from "react";
import { Brand } from "./ui";
import { SignOut, api } from "./forms";
import { Child } from "@/lib/types";
import styles from "./studio.module.css";
export function ParentShell({
  children,
  profiles,
  selected,
  name,
}: {
  children: ReactNode;
  profiles: Child[];
  selected?: Child;
  name: string;
}) {
  const path = usePathname(),
    router = useRouter(),
    root = selected ? `/app/children/${selected.id}` : "/app";
  const links = [
    { href: "/app", label: "Overview", icon: House },
    { href: `${root}/learning`, label: "Learning journey", icon: BookOpen },
    { href: `${root}/insights`, label: "How Da Vinci adapts", icon: Lightbulb },
    { href: `${root}/sessions`, label: "Session history", icon: History },
  ];
  useEffect(() => {
    void api("/api/analytics", {
      type: path.endsWith("/insights")
        ? "parent_insight_viewed"
        : "parent_dashboard_viewed",
    }).catch(() => {});
  }, [path]);
  return (
    <div className={`app-shell ${styles.parentShell}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="space-label">YOUR FAMILY’S SPACE</div>
        {selected && (
          <label className="child-selector">
            <span className="avatar">{selected.nickname[0]}</span>
            <span className="sr-only">Select child</span>
            <select
              value={selected.id}
              onChange={(e) => router.push(`/app/children/${e.target.value}`)}
            >
              {profiles.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.nickname}
                </option>
              ))}
            </select>
          </label>
        )}
        <nav aria-label="Parent navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={label}
              className={
                path === href || (label === "Overview" && path === root)
                  ? "nav-link active"
                  : "nav-link"
              }
              href={href}
            >
              <Icon size={19} />
              {label}
            </Link>
          ))}
          <div className="nav-divider" />
          <Link
            className={`nav-link ${path === "/app/children" ? "active" : ""}`}
            href="/app/children"
          >
            <Users size={19} />
            Child profiles
          </Link>
          <Link
            className={`nav-link ${path === "/app/settings" ? "active" : ""}`}
            href="/app/settings"
          >
            <Settings size={19} />
            Settings
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Sprout size={22} />
            <p>
              Small steps.
              <br />
              Lasting understanding.
            </p>
          </div>
          <div className="account">
            <span className="avatar neutral">{name[0]}</span>
            <div>
              <strong>{name}</strong>
              <small>Parent account</small>
            </div>
          </div>
          <SignOut />
        </div>
      </aside>
      <div className="app-body">
        <header className="app-topbar">
          <span className="topbar-label">A little progress, every day.</span>
          <span className="mode-label">
            <span />
            Parent space
          </span>
          {selected && (
            <Link className="child-mode" href={`/learn/${selected.id}`}>
              Go to {selected.nickname}’s space
              <ArrowUpRight size={16} />
            </Link>
          )}
        </header>
        <main id="main" className="parent-main">
          {children}
        </main>
        <footer className="app-footer">
          <span>Made for the way they learn.</span>
          <div>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
