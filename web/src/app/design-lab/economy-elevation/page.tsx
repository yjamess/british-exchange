import type { Metadata } from "next";
import { BrandRoot } from "@/brand/BrandRoot";
import { EconomyElevationLab } from "./EconomyElevationLab";

export const metadata: Metadata = {
  title: "Economy elevation · Design lab",
  description:
    "Lab: Economy visual elevation within brand tokens — grounds, plate treatments, icons, signature instruments. Not production.",
};

export default function Page() {
  return (
    <BrandRoot>
      <EconomyElevationLab />
    </BrandRoot>
  );
}
