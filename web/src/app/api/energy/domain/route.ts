import { NextRequest, NextResponse } from "next/server";
import { ENERGY_DOMAINS, type EnergyDomainId } from "@/brand/energy/domain-sources";
import { loadEnergy } from "@/brand/energy/load";
import { packTree } from "@/lib/wire";

export const dynamic = "force-dynamic";

const KNOWN = new Set<string>(ENERGY_DOMAINS);

/** One Energy domain's packs on the wire (`packTree`); `useDomainData` unpacks. Used by rail hops. */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("domain") ?? "";
  if (!KNOWN.has(raw)) return NextResponse.json({ error: "Unknown domain" }, { status: 400 });
  try {
    const data = await loadEnergy(raw as EnergyDomainId);
    return NextResponse.json(packTree(data), { headers: { "Cache-Control": "private, max-age=60" } });
  } catch {
    return NextResponse.json({ error: "Energy data is unavailable. Please try again later." }, { status: 503 });
  }
}
