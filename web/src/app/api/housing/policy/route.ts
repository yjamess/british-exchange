import { NextResponse } from "next/server";
import { loadPolicy } from "@/brand/housing/canvas/policy/policy.server";

/** Domain 10 — context tracks, pledges (with their matched series) and archive records. */
export async function GET() {
  try {
    return NextResponse.json(await loadPolicy(), {
      // Shared caches (CDN) may hold it; browsers revalidate, so a payload built while the API was
      // down is not replayed from the browser cache for a day.
      headers: { "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json({ error: "The housing policy record is unavailable. Please try again later." }, { status: 503 });
  }
}
