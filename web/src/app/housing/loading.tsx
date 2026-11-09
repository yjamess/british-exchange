import { BrandRoot } from "@/brand/BrandRoot";

export default function Loading() {
  return (
    <BrandRoot>
      <main style={{ padding: "clamp(24px, 5vw, 80px)" }} aria-busy="true">
        <p className="bo-label" role="status">Loading housing data…</p>
      </main>
    </BrandRoot>
  );
}
