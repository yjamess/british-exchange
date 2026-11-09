import { NextRequest, NextResponse } from "next/server";
import { loadAffordAtlas, loadAtlas, loadGeometry, loadRentAtlas } from "@/brand/housing/atlas/server";

const HPI = new Set(["average", "detached", "semi-detached", "terraced", "flat", "new-build", "existing", "sales-volume"]);

/**
 * Client map packs — atlas + pre-projected geometry in one response.
 * Prefer this over a full RSC round-trip when the user switches to Map.
 */
export async function GET(request: NextRequest) {
  const variant = request.nextUrl.searchParams.get("variant") ?? "hpi";
  const measure = request.nextUrl.searchParams.get("measure") ?? "average";
  try {
    const geometry = await loadGeometry();
    // Boundaries only — for stages that bring their own values (Housing insecurity Displacement).
    if (variant === "geometry") {
      return NextResponse.json(
        { geometry },
        { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" } },
      );
    }
    const atlas =
      variant === "rent"
        ? await loadRentAtlas("average-rent")
        : variant === "afford"
          ? await loadAffordAtlas("pte-median")
          : await loadAtlas(HPI.has(measure) ? measure : "average");
    return NextResponse.json(
      { atlas, geometry },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "The archived housing map data is unavailable. Please try again later." },
      { status: 503 },
    );
  }
}
