import { apiBase, apiInit, fetchPackText } from "@/lib/api";

/**
 * Land Explorer layers for one English local authority district.
 *
 * Index stays a named pack. District plates are served by the Exchange API
 * (`GET /housing/land-layers/{code}`): pinned / live-cache pack first, then a
 * live Planning Data query. Next.js does not spawn Python or read the laptop.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 90;

function isDistrict(code: string) {
  return /^(index|E0[6-9]\d{6})$/.test(code);
}

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isDistrict(code)) return new Response("Not found", { status: 404 });

  if (code === "index") {
    try {
      const body = await fetchPackText("housing.planning-index");
      return new Response(body, {
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600" },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }

  try {
    const res = await fetch(`${apiBase()}/housing/land-layers/${code}`, apiInit());
    if (res.ok) {
      const body = await res.text();
      return new Response(body, {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "public, max-age=3600",
          "x-bx-pack-source": res.headers.get("X-BX-Pack-Source") ?? "api",
        },
      });
    }
    const raw = await res.text();
    let detail = raw || `Planning layer request failed (${res.status}).`;
    try {
      const parsed = JSON.parse(raw) as { detail?: string };
      if (typeof parsed.detail === "string" && parsed.detail.trim()) detail = parsed.detail;
    } catch {
      /* plain-text body from older handlers */
    }
    return new Response(detail, {
      status: res.status === 404 ? 404 : res.status === 503 ? 503 : 502,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Planning layer request failed";
    return new Response(message, { status: 502 });
  }
}
