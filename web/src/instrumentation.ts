/** Next.js server start hook: warm the sector domain caches (Node runtime only). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startDomainWarmer } = await import("./lib/warm-domains");
  startDomainWarmer();
}
