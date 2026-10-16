"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pw, setPw] = useState({ current: "", next: "" });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setName(d.user.name);
          setEmail(d.user.email);
        }
      });
  }, []);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Could not update profile");
      setNotice("Profile updated.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: pw.current,
          newPassword: pw.next,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Could not change password");
      setPw({ current: "", next: "" });
      setNotice("Password changed.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="dashboard">
      <p className="eyebrow">MY ACCOUNT</p>
      <h1>Profile & password</h1>
      <p>
        <Link href="/dashboard">← Back to dashboard</Link>
      </p>
      {error && (
        <p role="alert" className="message">
          {error}
        </p>
      )}
      {notice && <p className="message">{notice}</p>}

      <form onSubmit={saveName} style={{ maxWidth: 480 }}>
        <h2>Profile</h2>
        <label>
          Full name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={100}
          />
        </label>
        <label>
          Email
          <input value={email} disabled readOnly />
        </label>
        <button className="button dark" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </form>

      <form onSubmit={changePassword} style={{ maxWidth: 480, marginTop: 40 }}>
        <h2>Change password</h2>
        <label>
          Current password
          <input
            type="password"
            value={pw.current}
            onChange={(e) => setPw({ ...pw, current: e.target.value })}
            required
            autoComplete="current-password"
          />
        </label>
        <label>
          New password
          <input
            type="password"
            value={pw.next}
            onChange={(e) => setPw({ ...pw, next: e.target.value })}
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
          />
        </label>
        <button className="button dark" disabled={busy}>
          {busy ? "Updating…" : "Change password"}
        </button>
      </form>
    </main>
  );
}
