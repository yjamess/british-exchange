import { NextResponse } from "next/server";
import { fetchPackJson } from "@/lib/api";

/** English region outlines (ONS, pre-projected to the atlas 760 × 880 frame) for the quality geography view. */
export async function GET() {
  try {
    const json = await fetchPackJson<unknown>("regions.english-regions-display");
    return NextResponse.json(json, {
      headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json({ error: "Region boundaries are unavailable." }, { status: 503 });
  }
}
