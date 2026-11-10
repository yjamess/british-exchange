import type { Metadata } from "next";
import { BrandRoot } from "@/brand/BrandRoot";
import { UnderStageLab } from "./UnderStageLab";

export const metadata: Metadata = {
  title: "Under the stage · Design lab",
  description: "Lab: order and weight of Notes and Next reading under an Explorer stage. Not production.",
};

export default function Page() {
  return (
    <BrandRoot>
      <UnderStageLab />
    </BrandRoot>
  );
}
