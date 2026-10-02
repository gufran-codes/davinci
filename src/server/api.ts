import { boardFor, saveBoard } from "./whiteboard";
import { studyScheduleFor, scheduleStudy, cancelStudy } from "./study-schedule";
import {
  controlsFor,
  saveControls,
  learningControlsSchema,
} from "./learning-controls";
import { conversationTurn, conversationalGreeting } from "./understanding";
import { deliveredSpeech } from "./conversation";
import { connectVoice, verifyWorkerToken } from "./voice/access";
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
  updateChildPreferences,
  event,
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
export const childSchema = z.object({
  nickname: z.string().trim().min(1).max(24),
  age: z.number().int().min(6).max(16),
  grade: z.number().int().min(1).max(10),
  goal: z.enum([
    "Fill learning gaps",
    "Improve confidence",
    "Stay on grade level",
    "Get ahead",
    "Help with schoolwork",
    "Reduce homework frustration",
  ]),
  subjects: z
    .array(z.enum(["Math", "English", "Science", "Social Studies"]))
    .min(1)
    .max(4),
});
const concept = z
  .string()
  .refine((id) => !!conceptById[id], "Choose a math concept.");
async function body(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > (req.nextUrl.pathname.endsWith("/board") ? 250000 : 10000))
    throw new HttpError(413, "That request is too large.");
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Please check the information and try again.");
  }
}
export const homeworkMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
// Photos are normalized to bounded JPEGs; PDFs and textbook scans are stored
// as uploaded (binary parsers are unavailable server-side) and identified by
// the AI provider, with manual skill choice as the offline fallback.
export async function prepareHomeworkUpload(file: unknown): Promise<{
  bytes: Buffer;
  mime: string;
  dataUrl: string;
}> {
  if (
    !(file instanceof File) ||
    file.size > 5 * 1024 * 1024 ||
    !(homeworkMimeTypes as string[]).includes(file.type)
  )
    throw new HttpError(
      400,
      "Choose a JPG, PNG, WebP, or PDF file smaller than 5 MB.",
    );
  const raw = Buffer.from(await file.arrayBuffer());
  if (file.type === "application/pdf")
    return {
      bytes: raw,
      mime: "application/pdf",
      dataUrl: `data:application/pdf;base64,${raw.toString("base64")}`,
    };
  const sharp = (await import("sharp")).default;
  try {
    const bytes = await sharp(raw, { limitInputPixels: 20_000_000 })
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return {
      bytes,
      mime: "image/jpeg",
      dataUrl: `data:image/jpeg;base64,${bytes.toString("base64")}`,
    };
  } catch {
    throw new HttpError(
      400,
      "That image could not be read. Try a different photo.",
    );
  }
}
export async function handle(req: NextRequest, path: string[]) {
  try {
    const route = path.join("/"),
      method = req.method;
    if (route === "voice/worker" && method === "POST") {
      const access = verifyWorkerToken(
        (req.headers.get("authorization") ?? "").replace(/^Bearer /, ""),
      );
      const child = ownedChild(access.parentId, access.childId);
      const input = z
        .object({
          action: z.enum(["greet", "turn", "speech", "metric"]),
          requestId: z.string().uuid().optional(),
          transcript: z.string().max(1500).optional(),
          version: z.number().int().optional(),
          turnId: z.string().optional(),
          spokenText: z.string().max(6000).optional(),
          interrupted: z.boolean().optional(),
          metric: z
            .object({
              type: z.enum(["orchestration", "stt", "turn", "tts"]),
              durationMs: z.number().nonnegative().max(120_000).optional(),
              ttfbMs: z.number().nonnegative().max(120_000).optional(),
              endOfUtteranceDelayMs: z
                .number()
                .nonnegative()
                .max(120_000)
                .optional(),
              transcriptionDelayMs: z
                .number()
                .nonnegative()
                .max(120_000)
                .optional(),
              at: z.number(),
            })
            .optional(),
        })
        .parse(await body(req));
      rateLimit(`voice:${access.childId}`, 500);
      if (input.action === "metric") {
        const session = sessionById(access.sessionId);
        if (session.childId !== child.id)
          throw new HttpError(404, "Lesson not found.");
        if (input.metric) event(session, "voice_latency", input.metric);
        return NextResponse.json({ ok: true });
      }
      if (input.action === "speech") {
        deliveredSpeech(child, access.sessionId, {
          turnId: input.turnId ?? "",
          spokenText: input.spokenText ?? "",
          interrupted: input.interrupted ?? false,
        });
        return NextResponse.json({ ok: true });
      }
      const session =
        input.action === "greet"
          ? await conversationalGreeting(child, access.sessionId)
          : await conversationTurn(child, access.sessionId, {
              requestId: input.requestId ?? "",
              version: input.version ?? -1,
              transcript: input.transcript ?? "",
              source: "voice",
            });
      return NextResponse.json({
        session: await publicSession(session, learnerFor(child.id), {
          grade: child.grade,
          age: child.age,
        }),
      });
    }
    if (method !== "GET") {
      const origin = req.headers.get("origin");
      // nextUrl.origin reflects the server listen address (0.0.0.0 when
      // bound with --hostname 0.0.0.0), not the address the browser used,
      // so derive the request's own origin from Host for this check.
      const host = req.headers.get("host");
      const proto = req.headers.get("x-forwarded-proto") ?? "http";
      const selfOrigin = host ? `${proto}://${host}` : req.nextUrl.origin;
      const allowed = process.env.APP_ORIGIN ?? selfOrigin;
      if (!origin || origin !== allowed)
        throw new HttpError(
          403,
          "Please open Da Vinci in its own browser tab and try again.",
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
            learningControls: controlsFor(c.id),
            studySchedule: studyScheduleFor(user.id, c.id),
            boards: sessionsFor(c.id).map((s) => ({
              sessionId: s.id,
              board: boardFor(s.id),
            })),
            sessions: sessionsFor(c.id),
            conversations: all(
              "SELECT session_id,student_transcript,generated_tutor_text,spoken_tutor_text,interrupted,created_at FROM conversation_turns WHERE child_id=? ORDER BY created_at",
              c.id,
            ),
            homework: all(
              "SELECT id,concept_id,created_at FROM homework_uploads WHERE child_id=?",
              c.id,
            ),
          })),
        },
        {
          headers: {
            "Content-Disposition":
              'attachment; filename="da-vinci-learning.json"',
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
      if (path[2] === "schedule") {
        if (method === "GET" && path.length === 3)
          return NextResponse.json({
            entries: studyScheduleFor(user.id, child.id),
          });
        if (method === "POST" && path.length === 3) {
          rateLimit(`schedule:${user.id}`, 60);
          return NextResponse.json({
            entry: scheduleStudy(user.id, child.id, await body(req)),
          });
        }
        if (method === "DELETE" && path.length === 4) {
          cancelStudy(user.id, child.id, z.string().uuid().parse(path[3]));
          return NextResponse.json({ ok: true });
        }
      }
      if (path.length === 2 && method === "PATCH")
        return NextResponse.json({
          child: updateChildPreferences(user.id, child.id, await body(req)),
        });
      if (path[2] === "controls") {
        if (method === "GET")
          return NextResponse.json({ controls: controlsFor(child.id) });
        if (method === "POST")
          return NextResponse.json({
            controls: saveControls(
              child.id,
              learningControlsSchema.parse(await body(req)),
            ),
          });
      }
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
            subject: z
              .enum(["Math", "English", "Science", "Social Studies"])
              .optional(),
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
          data.conceptId,
          data.homeworkId,
          data.kind === "homework" ? undefined : data.subject,
        );
        return NextResponse.json({
          session: await publicSession(session, learnerFor(child.id), {
            grade: child.grade,
            age: child.age,
          }),
        });
      }
      if (path[2] === "homework" && method === "POST") {
        rateLimit(`upload:${user.id}`, 20);
        const length = Number(req.headers.get("content-length"));
        if (length > 6 * 1024 * 1024)
          throw new HttpError(413, "Please choose a file smaller than 5 MB.");
        const form = await req.formData(),
          file = form.get("image");
        const upload = await prepareHomeworkUpload(file);
        const id = randomUUID();
        run(
          "INSERT INTO homework_uploads VALUES(?,?,?,?,?,?)",
          id,
          child.id,
          upload.mime,
          upload.bytes,
          null,
          now(),
        );
        const conceptId = await provider().identify(upload.dataUrl);
        if (conceptId)
          run(
            "UPDATE homework_uploads SET concept_id=? WHERE id=?",
            conceptId,
            id,
          );
        analytics.track(user.id, "homework_uploaded", { childId: child.id });
        const detected = conceptId ? conceptById[conceptId] : undefined;
        return NextResponse.json({
          id,
          conceptId,
          subject: detected?.subject ?? null,
          topic: detected?.topic ?? null,
          mime: upload.mime,
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
    if (path[0] === "sessions" && path[1] && path[2]) {
      const session = sessionById(path[1]),
        child = ownedChild(user.id, session.childId);
      if (path[2] === "board") {
        if (method === "GET")
          return NextResponse.json({ board: boardFor(session.id) });
        if (method === "POST")
          return NextResponse.json({
            board: saveBoard(session.id, await body(req)),
          });
      }
      if (path[2] === "voice" && method === "POST")
        return NextResponse.json(
          await connectVoice(user.id, child.id, session.id),
        );
      if (path[2] === "speech" && method === "POST") {
        const receipt = z
          .object({
            turnId: z.string().uuid(),
            spokenText: z.string().max(6000),
            interrupted: z.boolean(),
          })
          .parse(await body(req));
        deliveredSpeech(child, session.id, receipt);
        return NextResponse.json({ ok: true });
      }
      if (path[2] === "conversation" && method === "POST") {
        rateLimit(`conversation:${user.id}`, 500);
        const input = z
          .object({
            requestId: z.string().uuid(),
            version: z.number().int().min(0),
            transcript: z.string().trim().min(1).max(1500),
            source: z.enum(["voice", "text", "canvas"]),
            heard: z
              .object({
                turnId: z.string().uuid(),
                spokenText: z.string().max(6000),
                interrupted: z.boolean(),
              })
              .optional(),
          })
          .parse(await body(req));
        const next = await conversationTurn(child, session.id, input);
        return NextResponse.json({
          session: await publicSession(next, learnerFor(child.id), {
            grade: child.grade,
            age: child.age,
          }),
        });
      }
    }
    if (path[0] === "sessions" && path[1]) {
      const s = sessionById(path[1]),
        child = ownedChild(user.id, s.childId);
      if (method === "GET")
        return NextResponse.json({
          session: await publicSession(s, learnerFor(child.id), {
            grade: child.grade,
            age: child.age,
          }),
        });
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
              "note",
              "explain",
            ]),
            version: z.number().int().min(0),
            answer: z.string().trim().min(1).max(80).optional(),
            reflection: z
              .enum(["Ready for more", "A little clearer", "Still tricky"])
              .optional(),
            note: z.string().trim().min(1).max(500).optional(),
            confidence: z
              .enum(["guessing", "pretty_sure", "very_sure"])
              .optional(),
          })
          .parse(await body(req));
        if (data.action === "answer" && !data.answer)
          throw new HttpError(400, "Try an answer first.");
        if (data.action === "reflect" && !data.reflection)
          throw new HttpError(400, "Choose how it felt.");
        if (
          (data.action === "note" || data.action === "explain") &&
          !data.note &&
          !data.confidence
        )
          throw new HttpError(400, "Write a little something first.");
        return NextResponse.json({
          session: await publicSession(
            advanceSession(child, s.id, data),
            learnerFor(child.id),
            { grade: child.grade, age: child.age },
          ),
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
      "Da Vinci request failed",
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
