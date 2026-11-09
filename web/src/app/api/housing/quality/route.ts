import { NextResponse } from "next/server";
import { loadQualityEvidence } from "@/brand/housing/canvas/quality/cutaway/evidence.server";

/** Inside-the-home evidence table (EHS survey estimates), fetched on demand by the cutaway. */
export async function GET() {
  try {
    return NextResponse.json(await loadQualityEvidence(), {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json({ error: "The housing quality evidence is unavailable. Please try again later." }, { status: 503 });
  }
}
