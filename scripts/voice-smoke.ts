import { readFileSync } from "node:fs";
import {
  AudioFrame,
  AudioSource,
  AudioStream,
  LocalAudioTrack,
  Room,
  RoomEvent,
  TrackKind,
  TrackPublishOptions,
  TrackSource,
} from "@livekit/rtc-node";

const base = process.env.PRIMER_SERVER_URL ?? "http://localhost:3000";
const origin = new URL(base).origin;
const audioPath = process.argv[2];
if (!audioPath) throw Error("Pass a 16 kHz mono PCM WAV file.");

async function request(path: string, init: RequestInit = {}, cookie = "") {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...init.headers,
    },
  });
  if (!response.ok)
    throw Error(
      `${path} failed (${response.status}): ${await response.text()}`,
    );
  return response;
}

function pcmFromWav(path: string) {
  const wav = readFileSync(path);
  if (wav.toString("ascii", 0, 4) !== "RIFF")
    throw Error("Expected WAV audio.");
  let offset = 12;
  while (offset + 8 <= wav.length) {
    const name = wav.toString("ascii", offset, offset + 4);
    const length = wav.readUInt32LE(offset + 4);
    if (name === "data") {
      const bytes = wav.subarray(offset + 8, offset + 8 + length);
      return new Int16Array(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength / 2,
      );
    }
    offset += 8 + length + (length % 2);
  }
  throw Error("WAV data chunk is missing.");
}

function waitFor<T>(
  read: () => T | undefined,
  label: string,
  timeout = 45_000,
) {
  return new Promise<T>((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      const value = read();
      if (value !== undefined) {
        clearInterval(timer);
        resolve(value);
      } else if (Date.now() - started > timeout) {
        clearInterval(timer);
        reject(Error(`Timed out waiting for ${label}.`));
      }
    }, 100);
  });
}

const login = await request("/api/auth/demo", {
  method: "POST",
  body: "{}",
});
const cookie = login.headers.getSetCookie()[0]?.split(";", 1)[0];
if (!cookie) throw Error("Demo login did not set a session cookie.");

const children = (await (
  await request("/api/children", {}, cookie)
).json()) as {
  children: { id: string }[];
};
const child = children.children[0];
if (!child) throw Error("Demo family has no child.");
const started = (await (
  await request(
    `/api/children/${child.id}/sessions`,
    { method: "POST", body: JSON.stringify({ kind: "lesson" }) },
    cookie,
  )
).json()) as { session: { id: string } };
const voice = (await (
  await request(
    `/api/sessions/${started.session.id}/voice`,
    { method: "POST", body: "{}" },
    cookie,
  )
).json()) as { provider: string; url?: string; token?: string };
if (voice.provider !== "livekit" || !voice.url || !voice.token)
  throw Error("Da Vinci returned the browser fallback instead of LiveKit.");

const room = new Room();
const sessions: Array<{
  conversation?: { turnId: string; hintLevel: number };
}> = [];
const statuses: string[] = [];
let audibleFrames = 0;
const audioReaders: ReadableStreamDefaultReader<AudioFrame>[] = [];
room.on(RoomEvent.DataReceived, (payload) => {
  try {
    const data = JSON.parse(new TextDecoder().decode(payload));
    if (data.type === "session") sessions.push(data.session);
    if (data.type === "status") statuses.push(data.status);
  } catch {
    // Ignore unrelated LiveKit packets.
  }
});
room.on(RoomEvent.TrackSubscribed, (track) => {
  if (track.kind !== TrackKind.KIND_AUDIO) return;
  const stream = new AudioStream(track, { sampleRate: 16_000, numChannels: 1 });
  const reader = stream.getReader();
  audioReaders.push(reader);
  void (async () => {
    while (true) {
      const { done, value: frame } = await reader.read();
      if (done) break;
      if (frame.data.some((sample) => Math.abs(sample) > 100)) audibleFrames++;
    }
  })().catch(() => {});
});

await room.connect(voice.url, voice.token);
const first = await waitFor(
  () => sessions.find((session) => session.conversation)?.conversation,
  "the initial Da Vinci teaching turn",
);
await waitFor(
  () => (statuses.includes("speaking") ? true : undefined),
  "Cartesia tutor speech",
);
await waitFor(
  () =>
    statuses.lastIndexOf("listening") > statuses.lastIndexOf("speaking")
      ? true
      : undefined,
  "the tutor to finish speaking",
);
// Rejoining an existing room must replay the saved turn; onEnter only runs
// once per worker job. This is also the playback-unlock recovery path.
const sessionsBeforeRejoin = sessions.length;
const speakingBeforeRejoin = statuses.filter(
  (status) => status === "speaking",
).length;
await room.localParticipant?.publishData(
  new TextEncoder().encode(JSON.stringify({ type: "join" })),
  { reliable: true },
);
await waitFor(
  () =>
    sessions.length > sessionsBeforeRejoin &&
    sessions.at(-1)?.conversation?.turnId === first.turnId
      ? true
      : undefined,
  "the existing worker to restore its saved turn",
);
await waitFor(
  () =>
    statuses.filter((status) => status === "speaking").length >
      speakingBeforeRejoin && statuses.at(-1) === "listening"
      ? true
      : undefined,
  "the replayed greeting to finish",
);
const audibleFramesBeforeStudent = audibleFrames;
const speakingTurnsBeforeStudent = statuses.filter(
  (status) => status === "speaking",
).length;

const source = new AudioSource(16_000, 1);
const track = LocalAudioTrack.createAudioTrack("synthetic-child-mic", source);
const publish = new TrackPublishOptions();
publish.source = TrackSource.SOURCE_MICROPHONE;
await room.localParticipant?.publishTrack(track, publish);
const pcm = pcmFromWav(audioPath);
const samplesPerFrame = 320;
for (let offset = 0; offset < pcm.length; offset += samplesPerFrame) {
  const data = new Int16Array(samplesPerFrame);
  data.set(pcm.subarray(offset, offset + samplesPerFrame));
  await source.captureFrame(new AudioFrame(data, 16_000, 1, samplesPerFrame));
}
for (let frame = 0; frame < 150; frame++)
  await source.captureFrame(AudioFrame.create(16_000, 1, samplesPerFrame));

const next = await waitFor(
  () =>
    sessions.find(
      (session) =>
        session.conversation?.turnId !== first.turnId &&
        session.conversation?.hintLevel === 1,
    )?.conversation,
  "Deepgram transcript and Da Vinci hint response",
  60_000,
);
await waitFor(
  () =>
    statuses.filter((status) => status === "speaking").length >
    speakingTurnsBeforeStudent
      ? true
      : undefined,
  "Cartesia to start the response",
);
await waitFor(
  () =>
    audibleFrames > audibleFramesBeforeStudent + 5 ? audibleFrames : undefined,
  "audible Cartesia response audio frames",
);

console.log(
  JSON.stringify({
    provider: voice.provider,
    initialTurn: first.turnId,
    responseTurn: next.turnId,
    hintLevel: next.hintLevel,
    restoredExistingTurn: true,
    audibleFrames,
    responseAudioFrames: audibleFrames - audibleFramesBeforeStudent,
    statuses,
  }),
);
await track.close();
await Promise.all(audioReaders.map((reader) => reader.cancel()));
await room.disconnect();
process.exit(0);
