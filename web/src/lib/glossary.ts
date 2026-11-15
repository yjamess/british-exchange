/** Server-side glossary fetch for the root layout: cached, never blocks a page. */
import { apiBase, type GlossaryTerm } from "./api";

export async function loadGlossary(): Promise<GlossaryTerm[]> {
  try {
    const res = await fetch(`${apiBase()}/glossary`, {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    return (await res.json()) as GlossaryTerm[];
  } catch {
    return [];
  }
}
