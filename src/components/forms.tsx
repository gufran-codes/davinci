"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LoaderCircle, LogOut, Plus } from "lucide-react";
export async function api<T = Record<string, unknown>>(
  url: string,
  data?: unknown,
  method = "POST",
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers:
      data instanceof FormData ? {} : { "Content-Type": "application/json" },
    body:
      data instanceof FormData
        ? data
        : data === undefined
          ? undefined
          : JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401 && url !== "/api/auth/login")
      window.location.replace(new URL("/login", window.location.origin).href);
    throw new Error(result.error ?? "Something went wrong. Try again.");
  }
  return result as T;
}
export function AuthForm({ signup, demo }: { signup: boolean; demo: boolean }) {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(`/api/auth/${signup ? "signup" : "login"}`, data);
      router.push("/app");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function openDemo() {
    setBusy(true);
    try {
      await api("/api/auth/demo", {});
      router.push("/app");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <form onSubmit={submit} className="form-stack">
        {signup && (
          <label>
            Your first name
            <input
              name="name"
              autoComplete="given-name"
              maxLength={40}
              required
              placeholder="Alex"
            />
          </label>
        )}
        <label>
          Email address
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete={signup ? "new-password" : "current-password"}
            minLength={10}
            maxLength={128}
            required
            placeholder={signup ? "At least 10 characters" : "Your password"}
          />
        </label>
        {signup && (
          <label className="check-label">
            <input type="checkbox" required />
            I’m a parent or guardian, and agree to the{" "}
            <Link href="/terms">Terms</Link> and{" "}
            <Link href="/privacy">Privacy notice</Link>.
          </label>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="button" disabled={busy}>
          {busy ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <>
              {signup ? "Create your account" : "Welcome back"}
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
      <p className="auth-switch">
        {signup ? "Already part of Da Vinci?" : "New to Da Vinci?"}{" "}
        <Link href={signup ? "/login" : "/signup"}>
          {signup ? "Sign in" : "Create an account"}
        </Link>
      </p>
      {demo && (
        <button
          className="button secondary full"
          disabled={busy}
          onClick={openDemo}
        >
          Explore with a demo family <ArrowRight size={17} />
        </button>
      )}
    </>
  );
}
export function SignOut() {
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <>
      <button
        className="nav-signout"
        onClick={async () => {
          try {
            await api("/api/auth/logout", {});
            router.push("/login");
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <LogOut size={17} />
        Sign out
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
export function ChildForm() {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [grade, setGrade] = useState(4);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const { child } = await api<{ child: { id: string } }>("/api/children", {
        nickname: f.get("nickname"),
        age: Number(f.get("age")),
        grade: Number(f.get("grade")),
        goal: f.get("goal"),
        subjects: f.getAll("subjects"),
      });
      router.push(`/learn/${child.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <form className="form-stack" onSubmit={submit}>
      <label>
        What should we call your child?
        <input
          name="nickname"
          required
          maxLength={24}
          placeholder="A nickname is perfect"
          autoComplete="off"
        />
      </label>
      <div className="form-row grade-first-row">
        <label>
          Age
          <select name="age" defaultValue="9">
            {[6, 7, 8, 9, 10, 11].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="form-step">1</span> Choose their grade
          <select
            name="grade"
            value={grade}
            onChange={(event) => setGrade(Number(event.target.value))}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                Grade {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="subject-picker">
        <legend>
          <span className="form-step">2</span> Choose Grade {grade} subjects
        </legend>
        <p className="small muted subject-picker-help">
          Da Vinci will stay within this grade for new learning and can revisit
          earlier foundations when needed.
        </p>
        {["Math", "English", "Science", "Social Studies"].map((subject) => (
          <label className="check-label" key={subject}>
            <input
              type="checkbox"
              name="subjects"
              value={subject}
              defaultChecked={subject === "Math"}
            />
            {subject}
          </label>
        ))}
      </fieldset>
      <label>
        What would you most like help with?
        <select name="goal">
          {[
            "Fill learning gaps",
            "Improve confidence",
            "Stay on grade level",
            "Get ahead",
            "Help with schoolwork",
            "Reduce homework frustration",
          ].map((goal) => (
            <option key={goal}>{goal}</option>
          ))}
        </select>
      </label>
      <p className="small muted">
        No child email, full name, or date of birth needed.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button disabled={busy} className="button">
        {busy ? (
          "Creating a little space to learn…"
        ) : (
          <>
            Create child profile
            <Plus size={18} />
          </>
        )}
      </button>
    </form>
  );
}
export function DeleteAccount() {
  const [confirm, setConfirm] = useState(false),
    [error, setError] = useState("");
  return (
    <div>
      {confirm ? (
        <>
          <p>
            This permanently removes your account, child profiles, photos, and
            learning history.
          </p>
          <button
            className="button danger"
            onClick={async () => {
              try {
                await api("/api/account", undefined, "DELETE");
                window.location.replace(
                  new URL("/", window.location.origin).href,
                );
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Permanently delete my account
          </button>
          <button
            className="button secondary"
            onClick={() => setConfirm(false)}
          >
            Keep account
          </button>
        </>
      ) : (
        <button
          className="text-button danger-text"
          onClick={() => setConfirm(true)}
        >
          Delete account and all family data
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
