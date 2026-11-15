import { SectorSkeleton } from "@/brand/template/SectorSkeleton";

/** First render of /housing on the way. Rail hops never show this; they fetch in place. */
export default function Loading() {
  return <SectorSkeleton label="Housing & Land" name="Housing" />;
}
