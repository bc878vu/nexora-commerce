import { NextResponse } from "next/server";
import { getStoreSettings, toPublic } from "@/lib/store-settings";

/** Public store settings for checkout (secret keys are never exposed). */
export async function GET() {
  return NextResponse.json(toPublic(await getStoreSettings()));
}
