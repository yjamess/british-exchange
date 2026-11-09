import { apiBase } from "@/lib/api";

/**
 * Download one series as CSV: `/api/data/{indicator_id}`.
 * The one download link on the site (catalogue rows and every chart's source line).
 * Streams the API's curated file through, so large series are never held in memory.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    return new Response("Unknown series.", { status: 404 });
  }
  let upstream: Response;
  try {
    upstream = await fetch(`${apiBase()}/indicators/${id}/observations.csv`, { cache: "no-store" });
  } catch {
    return new Response("The data service is unavailable. Please try again later.", { status: 503 });
  }
  if (upstream.status === 404) return new Response("Unknown series.", { status: 404 });
  if (!upstream.ok || !upstream.body) {
    return new Response("The data service is unavailable. Please try again later.", { status: 503 });
  }
  const headers = new Headers({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": upstream.headers.get("content-disposition") ?? `attachment; filename="${id}.csv"`,
    "Cache-Control": "public, max-age=300",
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);
  return new Response(upstream.body, { headers });
}
