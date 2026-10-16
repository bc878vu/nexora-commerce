import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32)
    throw new Error("Session secret must contain at least 32 characters");
  return s;
}
export function signSession(id: string, role: string) {
  const body = Buffer.from(
    JSON.stringify({ id, role, exp: Date.now() + 86400000 * 7 }),
  ).toString("base64url");
  return body + "." + createHmac("sha256", secret()).update(body).digest("hex");
}
export function verifySession(token: string) {
  try {
    const [b, s] = token.split(".");
    const expected = createHmac("sha256", secret()).update(b).digest("hex");
    if (
      !s ||
      s.length !== expected.length ||
      !timingSafeEqual(Buffer.from(s), Buffer.from(expected))
    )
      return null;
    const v = JSON.parse(Buffer.from(b, "base64url").toString());
    return v.exp > Date.now() && typeof v.id === "string" ? v : null;
  } catch {
    return null;
  }
}
export async function session() {
  return verifySession((await cookies()).get("nexora_session")?.value ?? "");
}
export async function setSession(id: string = randomUUID(), role = "CUSTOMER") {
  (await cookies()).set("nexora_session", signSession(id, role), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 86400 * 7,
  });
  return id;
}
export async function isAdmin() {
  return (await session())?.role === "ADMIN";
}
export async function clearSession() {
  (await cookies()).delete("nexora_session");
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
