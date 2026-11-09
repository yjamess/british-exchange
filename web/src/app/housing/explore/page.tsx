import { redirect } from "next/navigation";

/**
 * Legacy atlas URL — the full map now lives on the Gate 2 housing page.
 * Preserve common query keys where they still apply.
 */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = new URLSearchParams({ domain: "prices", view: "map" });
  const pick = (key: string, as?: string) => {
    const v = params[key];
    if (typeof v === "string" && v) next.set(as ?? key, v);
  };
  pick("date");
  pick("area");
  pick("compare");
  pick("measure", "type"); // explore used measure=average|detached…
  if (params.mode === "change") next.set("measure", "change");
  redirect(`/housing?${next.toString()}`);
}
