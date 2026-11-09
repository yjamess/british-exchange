import { NextRequest, NextResponse } from "next/server";
import { rentArea, rentMap, rentPlaces } from "@/brand/housing/canvas/renting/catalogue.server";

/**
 * PIPR for the place, home and measure the reader selected.
 * `list=places` is the menu. `map=1` is every place for one series, for the atlas.
 * A single `area` is that place's full history.
 */

const MEASURES = new Set(["average-rent", "annual-change", "index"]);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  try {
    if (params.get("list") === "places") {
      const places = await rentPlaces();
      return NextResponse.json(
        { places },
        { headers: { "Cache-Control": "public, max-age=300" } },
      );
    }
    if (params.get("map") === "1") {
      const measure = params.get("measure") ?? "average-rent";
      const category = params.get("category") ?? "all";
      if (!MEASURES.has(measure)) {
        return NextResponse.json({ error: "That measure is not in the private rent file." }, { status: 400 });
      }
      const atlas = await rentMap(category, measure);
      return NextResponse.json({ atlas }, { headers: { "Cache-Control": "public, max-age=300" } });
    }
    const code = params.get("area") ?? "";
    if (!code) {
      return NextResponse.json({ error: "Choose a place." }, { status: 400 });
    }
    const area = await rentArea(code);
    if (!area) {
      return NextResponse.json({ error: "That place is not in the private rent file." }, { status: 404 });
    }
    return NextResponse.json(area, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return NextResponse.json(
      { error: "The private rent file could not be read. Please try again later." },
      { status: 503 },
    );
  }
}
