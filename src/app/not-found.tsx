import Link from "next/link";
export default function NotFound() {
  return (
    <main className="dashboard empty">
      <h1>Not quite here.</h1>
      <p>This page could not be found.</p>
      <Link href="/" className="button dark">
        Back to the collection
      </Link>
    </main>
  );
}
