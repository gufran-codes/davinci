"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="loading-screen">
      <h1>Let’s try that again.</h1>
      <p>That didn’t load properly. Your saved learning is still here.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
