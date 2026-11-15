import { NextRequest, NextResponse } from "next/server";
import { DOMAIN_SOURCES, type HousingDomain } from "@/brand/housing/domain-sources";
import { loadHousing } from "@/brand/housing/load";
import { loadAffordSpread } from "@/brand/housing/atlas/server";

export const dynamic = "force-dynamic";

/** One Housing domain's payload, the same shape the page renders with. Used by rail hops. */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("domain") ?? "";
  if (!(raw in DOMAIN_SOURCES)) return NextResponse.json({ error: "Unknown domain" }, { status: 400 });
  const domain = raw as HousingDomain;
  try {
    const [base, affordSpread] = await Promise.all([
      loadHousing(domain),
      domain === "affordability" ? loadAffordSpread() : Promise.resolve(null),
    ]);
    return NextResponse.json({ ...base, affordSpread }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch {
    return NextResponse.json({ error: "Housing data is unavailable. Please try again later." }, { status: 503 });
  }
}
