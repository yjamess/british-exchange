import type { Metadata } from "next";
import { BrandRoot } from "@/brand/BrandRoot";
import { DarkMomentsLab } from "./DarkMomentsLab";

export const metadata: Metadata = {
  title: "Dark moments · Design lab",
  description:
    "Lab: Union, night and film as the dark moments between white reading pages. Not production.",
};

export default function Page() {
  return (
    <BrandRoot>
      <DarkMomentsLab />
    </BrandRoot>
  );
}
