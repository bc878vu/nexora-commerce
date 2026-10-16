"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="dashboard empty">
      <h1>Something went wrong.</h1>
      <p>Please try again in a moment.</p>
      <button className="button dark" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
