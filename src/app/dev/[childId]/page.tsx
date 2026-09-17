import { notFound } from "next/navigation";
import { pageUser } from "@/server/auth";
import {
  eventsFor,
  learnerFor,
  ownedChild,
  sessionsFor,
} from "@/server/repository";
import { chooseDecision, planLesson } from "@/lib/learning";
export const dynamic = "force-dynamic";
export default async function Inspector({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const user = await pageUser(),
    { childId } = await params;
  let child;
  try {
    child = ownedChild(user.id, childId);
  } catch {
    notFound();
  }
  const learner = learnerFor(child.id),
    plan = planLesson(child, learner);
  return (
    <main className="legal inspector">
      <h1>Development inspector</h1>
      <p>Owner-scoped · unavailable in production</p>
      {Object.entries({
        child,
        plan,
        decision: chooseDecision(learner, plan.targetConcept),
        learner,
        sessions: sessionsFor(child.id),
        events: eventsFor(child.id),
      }).map(([name, value]) => (
        <details key={name} open={name === "decision"}>
          <summary>{name}</summary>
          <pre>{JSON.stringify(value, null, 2)}</pre>
        </details>
      ))}
    </main>
  );
}
