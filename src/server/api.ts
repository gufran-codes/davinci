import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  authenticate,
  currentUser,
  rateLimit,
  register,
  requireUser,
  signIn,
  signOut,
} from "./auth";
import {
  childrenFor,
  createChild,
  HttpError,
  learnerFor,
  now,
  ownedChild,
  sessionById,
  sessionsFor,
} from "./repository";
import { all, one, run } from "./db";
import { analytics, trackReturn } from "./analytics";
import { advanceSession, startSession } from "./orchestrator";
import { provider, publicSession } from "./provider";
import { seedChildren } from "./demo";
import { conceptById } from "../lib/curriculum";
const credentials = z.object({
  email: z
    .email()
    .max(254)
    .transform((s) => s.toLowerCase().trim()),
  password: z.string().min(10).max(128),
  name: z.string().trim().min(1).max(40).optional(),
});
const childSchema = z.object({
  nickname: z.string().trim().min(1).max(24),
  age: z.number().int().min(7).max(11),
  grade: z.number().int().min(1).max(6),
  goal: z.enum([
    "Understand difficult concepts",
    "Reduce homework frustration",
    "Build confidence",
    "Catch up",
    "Stay ahead",
    "Get personalized math practice",
  ]),
});
const concept = z
  .string()
  .refine((id) => !!conceptById[id], "Choose a math concept.");
async function body(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > 10000)
    throw new HttpError(413, "That request is too large.");
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Please check the information and try again.");
  }
}
export async function handle(req: NextRequest, path: string[]) {
  try {
    const route = path.join("/"),
      method = req.method;
    if (method !== "GET") {
      const origin = req.headers.get("origin");
      const allowed = process.env.APP_ORIGIN ?? req.nextUrl.origin;
      if (!origin || origin !== allowed)
        throw new HttpError(
          403,
          "Please open Primer in its own browser tab and try again.",
        );
    }
    if (method === "POST" && ["auth/login", "auth/signup"].includes(route)) {
      const data = credentials.parse(await body(req));
      rateLimit(`auth:${data.email}`);
      rateLimit("auth:global", 150);
      const user =
        route === "auth/signup"
          ? register(data.name ?? "Parent", data.email, data.password)
          : authenticate(data.email, data.password);
      await signIn(user.id);
      if (route === "auth/signup") analytics.track(user.id, "signup_completed");
      trackReturn(user.id, user.createdAt);
      return NextResponse.json({ ok: true });
    }
    if (method === "POST" && route === "auth/demo") {
      if (process.env.NODE_ENV !== "development")
        throw new HttpError(404, "Not found.");
      rateLimit("demo", 20);
      const user = register(
        "Alex",
        `demo-${randomUUID()}@primer.local`,
        randomUUID(),
      );
      seedChildren(user.id);
      await signIn(user.id);
      return NextResponse.json({ ok: true });
    }
    if (method === "POST" && route === "auth/logout") {
      await signOut();
      return NextResponse.json({ ok: true });
    }
    if (method === "GET" && route === "me")
      return NextResponse.json({ user: await currentUser() });
    const user = await requireUser();
    if (route === "children" && method === "POST") {
      rateLimit(`child:${user.id}`, 20);
      const child = createChild(user.id, childSchema.parse(await body(req)));
      analytics.track(user.id, "child_created", { childId: child.id });
      return NextResponse.json({ child });
    }
    if (route === "children" && method === "GET")
      return NextResponse.json({ children: childrenFor(user.id) });
    if (route === "account" && method === "DELETE") {
      run("DELETE FROM users WHERE id=?", user.id);
      await signOut();
      return NextResponse.json({ ok: true });
    }
    if (route === "account/export" && method === "GET") {
      const children = childrenFor(user.id);
      return NextResponse.json(
        {
          user,
          children: children.map((c) => ({
            ...c,
            learner: learnerFor(c.id),
            sessions: sessionsFor(c.id),
            homework: all(
              "SELECT id,concept_id,created_at FROM homework_uploads WHERE child_id=?",
              c.id,
            ),
          })),
        },
        {
          headers: {
            "Content-Disposition":
              'attachment; filename="primer-learning.json"',
            "Cache-Control": "no-store",
          },
        },
      );
    }
    if (route === "analytics" && method === "POST") {
      const data = z
        .object({
          type: z.enum(["parent_dashboard_viewed", "parent_insight_viewed"]),
        })
        .parse(await body(req));
      rateLimit(`analytics:${user.id}`, 120);
      analytics.track(user.id, data.type);
      return NextResponse.json({ ok: true });
    }
    if (path[0] === "children" && path[1]) {
      const child = ownedChild(user.id, path[1]);
      if (path.length === 2 && method === "DELETE") {
        run(
          "DELETE FROM children WHERE id=? AND parent_id=?",
          child.id,
          user.id,
        );
        return NextResponse.json({ ok: true });
      }
      if (path[2] === "sessions" && method === "POST") {
        rateLimit(`session:${user.id}`, 80);
        const data = z
          .object({
            kind: z.enum(["lesson", "diagnostic", "homework"]),
            conceptId: concept.optional(),
            homeworkId: z.string().uuid().optional(),
          })
          .parse(await body(req));
        if (data.kind === "homework") {
          if (
            !data.homeworkId ||
            !data.conceptId ||
            !one(
              "SELECT id FROM homework_uploads WHERE id=? AND child_id=?",
              data.homeworkId,
              child.id,
            )
          )
            throw new HttpError(
              400,
              "Upload your homework and choose a concept first.",
            );
          run(
            "UPDATE homework_uploads SET concept_id=? WHERE id=?",
            data.conceptId,
            data.homeworkId,
          );
        }
        const session = startSession(
          child,
          data.kind,
          data.kind === "homework" ? data.conceptId : undefined,
          data.homeworkId,
        );
        return NextResponse.json({ session: await publicSession(session) });
      }
      if (path[2] === "homework" && method === "POST") {
        rateLimit(`upload:${user.id}`, 20);
        const length = Number(req.headers.get("content-length"));
        if (length > 6 * 1024 * 1024)
          throw new HttpError(413, "Please choose an image smaller than 5 MB.");
        const form = await req.formData(),
          file = form.get("image");
        if (
          !(file instanceof File) ||
          file.size > 5 * 1024 * 1024 ||
          !["image/jpeg", "image/png", "image/webp"].includes(file.type)
        )
          throw new HttpError(
            400,
            "Choose a JPG, PNG, or WebP image smaller than 5 MB.",
          );
        const raw = Buffer.from(await file.arrayBuffer());
        const sharp = (await import("sharp")).default;
        let bytes: Buffer;
        try {
          bytes = await sharp(raw, { limitInputPixels: 20_000_000 })
            .rotate()
            .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toBuffer();
        } catch {
          throw new HttpError(
            400,
            "That image could not be read. Try a different photo.",
          );
        }
        const id = randomUUID();
        run(
          "INSERT INTO homework_uploads VALUES(?,?,?,?,?,?)",
          id,
          child.id,
          "image/jpeg",
          bytes,
          null,
          now(),
        );
        const conceptId = await provider().identify(
          `data:image/jpeg;base64,${bytes.toString("base64")}`,
        );
        if (conceptId)
          run(
            "UPDATE homework_uploads SET concept_id=? WHERE id=?",
            conceptId,
            id,
          );
        analytics.track(user.id, "homework_uploaded", { childId: child.id });
        return NextResponse.json({
          id,
          conceptId,
          previewUrl: `/api/children/${child.id}/homework/${id}`,
          manual: !conceptId,
        });
      }
      if (path[2] === "homework" && path[3] && method === "GET") {
        const row = one<{ image: Uint8Array; mime: string }>(
          "SELECT image,mime FROM homework_uploads WHERE id=? AND child_id=?",
          path[3],
          child.id,
        );
        if (!row) throw new HttpError(404, "Photo not found.");
        return new NextResponse(row.image as BodyInit, {
          headers: {
            "Content-Type": row.mime,
            "Cache-Control": "private, no-store",
          },
        });
      }
    }
    if (path[0] === "sessions" && path[1]) {
      const s = sessionById(path[1]),
        child = ownedChild(user.id, s.childId);
      if (method === "GET")
        return NextResponse.json({ session: await publicSession(s) });
      if (method === "POST") {
        rateLimit(`interaction:${user.id}`, 300);
        const data = z
          .object({
            action: z.enum([
              "answer",
              "hint",
              "another",
              "continue",
              "reflect",
            ]),
            version: z.number().int().min(0),
            answer: z.string().trim().min(1).max(80).optional(),
            reflection: z
              .enum(["Ready for more", "A little clearer", "Still tricky"])
              .optional(),
          })
          .parse(await body(req));
        if (data.action === "answer" && !data.answer)
          throw new HttpError(400, "Try an answer first.");
        if (data.action === "reflect" && !data.reflection)
          throw new HttpError(400, "Choose how it felt.");
        return NextResponse.json({
          session: await publicSession(advanceSession(child, s.id, data)),
        });
      }
    }
    throw new HttpError(404, "Not found.");
  } catch (error) {
    if (error instanceof HttpError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Please check the form." },
        { status: 400 },
      );
    console.error(
      "Primer request failed",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json(
      {
        error:
          "That didn’t save properly. Your earlier progress is safe. Please try again.",
      },
      { status: 500 },
    );
  }
}
