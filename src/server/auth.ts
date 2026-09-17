import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
  randomUUID,
} from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { one, run, transaction } from "./db";
import { HttpError, now } from "./repository";
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, hash: string) {
  const [salt, key] = hash.split(":");
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(key, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get("primer_session")?.value;
  if (!token) return null;
  return (
    one<User>(
      "SELECT u.id,u.email,u.name,u.created_at AS createdAt FROM users u JOIN auth_sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?",
      tokenHash(token),
      now(),
    ) ?? null
  );
}
export async function requireUser() {
  const user = await currentUser();
  if (!user)
    throw new HttpError(401, "Please sign in again. Your learning is saved.");
  return user;
}
export async function pageUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
export function register(name: string, email: string, password: string): User {
  if (one("SELECT id FROM users WHERE email=?", email))
    throw new HttpError(
      409,
      "An account with that email already exists. Please sign in.",
    );
  const user = { id: randomUUID(), email, name, createdAt: now() };
  run(
    "INSERT INTO users VALUES(?,?,?,?,?)",
    user.id,
    email,
    name,
    hashPassword(password),
    user.createdAt,
  );
  return user;
}
export function authenticate(email: string, password: string): User {
  const u = one<User & { password_hash: string }>(
    "SELECT id,email,name,password_hash,created_at AS createdAt FROM users WHERE email=?",
    email,
  );
  const dummy = "00000000000000000000000000000000:" + "00".repeat(64);
  const valid = verifyPassword(password, u?.password_hash ?? dummy);
  if (!u || !valid)
    throw new HttpError(
      401,
      "That email and password don’t match. Please try again.",
    );
  return { id: u.id, email: u.email, name: u.name, createdAt: u.createdAt };
}
export async function signIn(userId: string) {
  const token = randomBytes(32).toString("hex");
  run("DELETE FROM auth_sessions WHERE expires_at<?", now());
  run(
    "INSERT INTO auth_sessions VALUES(?,?,?)",
    tokenHash(token),
    userId,
    new Date(Date.now() + 30 * 86400000).toISOString(),
  );
  (await cookies()).set("primer_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 86400,
  });
}
export async function signOut() {
  const jar = await cookies(),
    token = jar.get("primer_session")?.value;
  if (token)
    run("DELETE FROM auth_sessions WHERE token_hash=?", tokenHash(token));
  jar.delete("primer_session");
}
export function rateLimit(key: string, limit = 12, windowMs = 15 * 60 * 1000) {
  transaction(() => {
    const nowMs = Date.now();
    run("DELETE FROM rate_limits WHERE resets_at<?", nowMs);
    const row = one<{ count: number; resets_at: number }>(
      "SELECT * FROM rate_limits WHERE key=?",
      key,
    );
    if (row && row.count >= limit)
      throw new HttpError(
        429,
        "Please wait a few minutes before trying again.",
      );
    run(
      "INSERT INTO rate_limits VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET count=count+1",
      key,
      1,
      nowMs + windowMs,
    );
  });
}
