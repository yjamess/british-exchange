import type { Metadata } from "next";
import { BrandRoot } from "@/brand/BrandRoot";
import { EmojiLab } from "./EmojiLab";

export const metadata: Metadata = {
  title: "Sector emoji · Design lab",
  description: "Lab: one emoji per sector, drawn in the engraved-line icon grammar. Not production.",
};

export default function Page() {
  return (
    <BrandRoot>
      <EmojiLab />
    </BrandRoot>
  );
}
