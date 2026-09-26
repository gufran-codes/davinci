import { createHmac, timingSafeEqual } from "node:crypto";
import { AccessToken, AgentDispatchClient } from "livekit-server-sdk";
import { HttpError } from "../repository";

function voiceWorkerSecret() {
  return process.env.PRIMER_WORKER_SECRET ?? process.env.VOICE_WORKER_SECRET;
}

export function voiceConfigured() {
  return (
    ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"].every(
      (key) => !!process.env[key],
    ) && !!voiceWorkerSecret()
  );
}
export function workerToken(
  parentId: string,
  childId: string,
  sessionId: string,
) {
  const payload = Buffer.from(
    JSON.stringify({
      parentId,
      childId,
      sessionId,
      expires: Date.now() + 2 * 60 * 60 * 1000,
    }),
  ).toString("base64url");
  const secret = voiceWorkerSecret();
  if (!secret) throw new HttpError(503, "Voice is not configured.");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
export function verifyWorkerToken(token: string) {
  const [payload, signature] = token.split("."),
    secret = voiceWorkerSecret();
  if (!payload || !signature || !secret)
    throw new HttpError(401, "Invalid voice session.");
  const expected = createHmac("sha256", secret).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw new HttpError(401, "Invalid voice session.");
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
    parentId: string;
    childId: string;
    sessionId: string;
    expires: number;
  };
  if (decoded.expires < Date.now())
    throw new HttpError(401, "Voice session expired.");
  return decoded;
}
export async function connectVoice(
  parentId: string,
  childId: string,
  sessionId: string,
) {
  if (!voiceConfigured()) return { provider: "browser" as const };
  const url = process.env.LIVEKIT_URL!,
    room = `primer-${sessionId}`,
    token = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      { identity: `child-${childId}`, ttl: "2h" },
    );
  token.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  const dispatch = new AgentDispatchClient(
    url,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
  );
  const existing = await dispatch.listDispatch(room).catch(() => []);
  if (!existing.length)
    await dispatch.createDispatch(room, "primer-tutor", {
      metadata: JSON.stringify({
        sessionId,
        token: workerToken(parentId, childId, sessionId),
      }),
    });
  return { provider: "livekit" as const, url, token: await token.toJwt() };
}
