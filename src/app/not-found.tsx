import Link from "next/link";
export default function NotFound() {
  return (
    <main className="loading-screen">
      <h1>A little off the path.</h1>
      <p>We couldn’t find that page.</p>
      <Link className="button" href="/app">
        Back to your space
      </Link>
    </main>
  );
}
