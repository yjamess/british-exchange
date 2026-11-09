import { readFile } from "node:fs/promises";
import path from "node:path";

/** English local authority names for Land Explorer search (Land Use Stock 2022). */
const file = path.resolve(process.cwd(), "../data/housing/planning-layers/curated/authorities.json");

export async function GET() {
  try {
    const body = await readFile(file, "utf8");
    return new Response(body, {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=86400" },
    });
  } catch {
    return new Response("Authority list is not built yet.", { status: 404 });
  }
}
