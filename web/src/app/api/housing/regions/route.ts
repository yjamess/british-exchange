import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

/** English region outlines (ONS, pre-projected to the atlas 760 × 880 frame) for the quality geography view. */
export async function GET() {
  try {
    const file = path.resolve(process.cwd(), "../data/regions/housing-boundaries/curated/english-regions-display.json");
    const json = JSON.parse(await readFile(file, "utf8"));
    return NextResponse.json(json, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
  } catch {
    return NextResponse.json({ error: "Region boundaries are unavailable." }, { status: 503 });
  }
}
