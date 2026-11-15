"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { GlossaryTerm } from "@/lib/api";

/* ——— Registry: every term on the site, keyed by slug ——— */
const GlossaryCtx = createContext<Map<string, GlossaryTerm>>(new Map());

export function GlossaryProvider({ terms, children }: { terms: GlossaryTerm[]; children: ReactNode }) {
  const map = useMemo(() => new Map(terms.map((t) => [t.slug, t])), [terms]);
  return <GlossaryCtx.Provider value={map}>{children}</GlossaryCtx.Provider>;
}

export function useGlossary(): Map<string, GlossaryTerm> {
  return useContext(GlossaryCtx);
}

export function useTerm(slug: string): GlossaryTerm | undefined {
  return useGlossary().get(slug);
}

/* ——— Scope: which terms a stage has marked, so its Notes foot can list them ——— */
type Scope = {
  slugs: string[];
  register: (slug: string) => () => void;
};

const ScopeCtx = createContext<Scope | null>(null);

export function TermScopeProvider({ children }: { children: ReactNode }) {
  const counts = useRef(new Map<string, number>());
  const [slugs, setSlugs] = useState<string[]>([]);
  const register = useCallback((slug: string) => {
    const c = counts.current;
    c.set(slug, (c.get(slug) ?? 0) + 1);
    setSlugs([...c.keys()]);
    return () => {
      const n = (c.get(slug) ?? 1) - 1;
      if (n <= 0) c.delete(slug);
      else c.set(slug, n);
      setSlugs([...c.keys()]);
    };
  }, []);
  const value = useMemo(() => ({ slugs, register }), [slugs, register]);
  return <ScopeCtx.Provider value={value}>{children}</ScopeCtx.Provider>;
}

export function useTermScope(): Scope | null {
  return useContext(ScopeCtx);
}
