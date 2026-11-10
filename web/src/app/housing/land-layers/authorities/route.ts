import { fetchPackText } from "@/lib/api";

/** English local authority names for Land Explorer search (Land Use Stock 2022). */
export async function GET() {
  try {
    const body = await fetchPackText("housing.planning-authorities");
    return new Response(body, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Authority list is not built yet.", { status: 404 });
  }
}
