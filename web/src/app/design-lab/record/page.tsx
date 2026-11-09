import type { Metadata } from "next";
import { BrandRoot } from "@/brand/BrandRoot";
import { RecordLab } from "./RecordLab";

export const metadata: Metadata = {
  title: "Figure record · Design lab",
  description: "Lab: one place for a figure’s definition, method and data link. Not production.",
};

/** Lab — three treatments for the foot under every Housing stage. */
export default function Page() {
  return (
    <BrandRoot>
      <RecordLab />
    </BrandRoot>
  );
}
