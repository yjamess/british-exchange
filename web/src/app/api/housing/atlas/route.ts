import { NextRequest, NextResponse } from "next/server";
import { loadAtlas } from "@/brand/housing/atlas/server";
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(await loadAtlas(request.nextUrl.searchParams.get("measure") ?? "average"), {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json({ error: "The archived housing data is unavailable. Please try again later." }, { status: 503 });
  }
}
