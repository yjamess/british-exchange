import type { Metadata } from "next";
import { BrandRoot } from "@/brand/BrandRoot";
import { FollowLab } from "./FollowLab";

export const metadata: Metadata = {
  title: "Follow · Design lab",
  description:
    "Lab: visual treatments for Explorer connections (Follow). Not production.",
};

/** Lab — compare Follow treatments before locking brand chrome. */
export default function Page() {
  return (
    <BrandRoot>
      <FollowLab />
    </BrandRoot>
  );
}
