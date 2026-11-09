import type { Metadata } from "next";
import { BrandRoot } from "@/brand/BrandRoot";
import { PolicyLedgerLab } from "./PolicyLedgerLab";

export const metadata: Metadata = {
  title: "Policy ledger · Design lab",
  description:
    "Lab: slab Decision Ledger — comparing open-dossier interiors. Not production.",
};

/** Lab — slab shell locked; interiors under test. Does not change live PolicyCanvas. */
export default function Page() {
  return (
    <BrandRoot>
      <PolicyLedgerLab />
    </BrandRoot>
  );
}
