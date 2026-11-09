import { BrandRoot } from "@/brand/BrandRoot";

/** Shown while a sector route (including Energy domain switches) reloads server data. */
export default function Loading() {
  return (
    <BrandRoot>
      <main style={{ padding: "clamp(24px, 5vw, 80px)" }} aria-busy="true">
        <p className="bo-label" role="status">
          Loading…
        </p>
      </main>
    </BrandRoot>
  );
}
