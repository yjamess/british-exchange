import type { GlossaryTerm } from "@/lib/api";

/** Terms whose short form, full name or definition contain every word of the query. Short list. */
export function matchTerms(terms: GlossaryTerm[], q: string, limit = 6): GlossaryTerm[] {
  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (words.length === 0) return [];
  const hits = terms.filter((t) => {
    const hay = `${t.short} ${t.full_name} ${t.definition}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  // Exact short-form matches first (someone typing "HHSRS" wants that row at the top).
  const exact = q.trim().toLowerCase();
  hits.sort((a, b) => Number(b.short.toLowerCase() === exact) - Number(a.short.toLowerCase() === exact) || a.short.localeCompare(b.short));
  return hits.slice(0, limit);
}
