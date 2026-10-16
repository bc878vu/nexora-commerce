import { NextResponse } from "next/server";
import { isAdmin, sameOrigin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { settingsInput } from "@/lib/validation";
import { getStoreSettings, toPublic } from "@/lib/store-settings";

/** Admin: full settings (includes secret keys — admin only). */
export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const s = await getStoreSettings();
  if (!s)
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  return NextResponse.json({ settings: { ...toPublic(s), stripeSecretKey: s.stripeSecretKey, paypalSecret: s.paypalSecret } });
}

export async function PUT(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = settingsInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Check settings fields." }, { status: 400 });
  try {
    const settings = await prisma.storeSettings.upsert({
      where: { id: "default" },
      update: { ...parsed.data },
      create: { id: "default", ...parsed.data },
    });
    return NextResponse.json({ ok: true, updatedAt: settings.updatedAt });
  } catch {
    return NextResponse.json({ error: "Could not save settings." }, { status: 500 });
  }
}
