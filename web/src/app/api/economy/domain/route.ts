import { NextRequest, NextResponse } from "next/server";
import { resolveEconomyDomain } from "@/brand/economy/domain-sources";
import { loadEconomy } from "@/brand/economy/load";
import { packTree } from "@/lib/wire";

export const dynamic = "force-dynamic";

/** One Economy domain's packs on the wire (`packTree`); `useDomainData` unpacks. Used by rail hops. */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("domain") ?? undefined;
  const domain = resolveEconomyDomain(raw);
  if (raw !== undefined && raw !== domain) return NextResponse.json({ error: "Unknown domain" }, { status: 400 });
  try {
    const data = await loadEconomy(domain);
    return NextResponse.json(packTree(data), { headers: { "Cache-Control": "private, max-age=60" } });
  } catch {
    return NextResponse.json({ error: "Economy data is unavailable. Please try again later." }, { status: 503 });
  }
}
