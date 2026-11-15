import { SectorSkeleton } from "@/brand/template/SectorSkeleton";

/** First render of a sector route on the way. Rail hops never show this; they fetch in place. */
export default function Loading() {
  return <SectorSkeleton />;
}
