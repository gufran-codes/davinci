import { ChildPreferences } from "@/components/child-preferences";
import { LearningControlsForm } from "@/components/learning-controls";
import { controlsFor } from "@/server/learning-controls";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Plus, ArrowRight, Shield, Download } from "lucide-react";
import { pageUser } from "@/server/auth";
import {
  childrenFor,
  ownedChild,
  learnerFor,
  sessionsFor,
  now,
} from "@/server/repository";
import { ParentShell } from "@/components/parent-shell";
import {
  Dashboard,
  Insights,
  LearningJourney,
  SessionHistory,
} from "@/components/parent-content";
import { ChildForm, DeleteAccount } from "@/components/forms";
import { ButtonLink, PageHeading } from "@/components/ui";
export const dynamic = "force-dynamic";
export default async function ParentPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const user = await pageUser(),
    path = (await params).path ?? [],
    children = childrenFor(user.id);
  let child = children[0];
  if (path[0] === "children" && path[1] && path[1] !== "new") {
    try {
      child = ownedChild(user.id, path[1]);
    } catch {
      notFound();
    }
  }
  let content;
  if (path[0] === "settings")
    content = (
      <>
        <PageHeading
          eyebrow="YOUR FAMILY, YOUR CHOICE"
          title="A little housekeeping."
          description="Your account and the information you choose to share."
        />
        <section className="card settings-card">
          <h2>Your account</h2>
          <dl>
            <dt>Name</dt>
            <dd>{user.name}</dd>
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>Learning</dt>
            <dd>
              Grades 1–10 profiles · Math, English, Science, Social Studies.
              Grades 6–10 teaching content is being prepared.
            </dd>
          </dl>
        </section>
        {children.map((c) => (
          <div key={c.id}>
            <h2>
              {c.nickname} · Grade {c.grade}
            </h2>
            <ChildPreferences child={c} />
            <LearningControlsForm childId={c.id} initial={controlsFor(c.id)} />
          </div>
        ))}
        <section className="card spaced settings-card">
          <span className="icon-disc">
            <Shield size={21} />
          </span>
          <h2>Your family’s information</h2>
          <p className="muted">
            Learning records stay with your account. Homework photos are
            private. You can export your learning history or remove all your
            data below.
          </p>
          <a className="button secondary" href="/api/account/export" download>
            <Download size={17} />
            Export learning history
          </a>
          <div className="settings-divider">
            <DeleteAccount />
          </div>
        </section>
      </>
    );
  else if (path[0] === "children" && path.length === 1)
    content = (
      <>
        <PageHeading
          eyebrow="EVERY CHILD, THEIR OWN PATH"
          title="Your little learners."
          description="Different starting points. A thoughtful approach for each."
          action={
            <ButtonLink href="/app/children/new">
              <Plus size={18} />
              Add a child
            </ButtonLink>
          }
        />
        <div className="profile-grid">
          {children.map((c) => (
            <Link
              key={c.id}
              href={`/app/children/${c.id}`}
              className="card profile-card"
            >
              <span className="avatar large">{c.nickname[0]}</span>
              <h2>{c.nickname}</h2>
              <p className="muted">
                Age {c.age} · Grade {c.grade}
              </p>
              <span className="status">{c.goal}</span>
              <span className="text-link">
                See their learning
                <ArrowRight size={17} />
              </span>
            </Link>
          ))}
        </div>
        {!children.length && (
          <section className="card narrow">
            <ChildForm />
          </section>
        )}
      </>
    );
  else if (path[1] === "new" || !child)
    content = (
      <>
        <PageHeading
          eyebrow="A PERSONAL PLACE TO BEGIN"
          title="Meet your little learner."
          description="A few details help us find the right starting point."
        />
        <section className="card narrow onboarding-card">
          <ChildForm />
        </section>
      </>
    );
  else {
    const learner = learnerFor(child.id),
      sessions = sessionsFor(child.id),
      tab = path[2];
    if (!path.length || path.length === 2)
      content = (
        <Dashboard
          child={child}
          learner={learner}
          sessions={sessions}
          now={Date.parse(now())}
        />
      );
    else if (tab === "learning")
      content = <LearningJourney child={child} learner={learner} />;
    else if (tab === "insights")
      content = <Insights child={child} learner={learner} />;
    else if (tab === "sessions")
      content = (
        <SessionHistory child={child} sessions={sessions} detail={path[3]} />
      );
    else redirect("/app");
  }
  return (
    <ParentShell profiles={children} selected={child} name={user.name}>
      {user.email.endsWith("@primer.local") && (
        <p className="demo-banner">
          Demo family · Starting learning records are illustrative. New sessions
          record your actual interactions.
        </p>
      )}
      {content}
    </ParentShell>
  );
}
