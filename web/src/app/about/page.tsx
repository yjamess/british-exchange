import type { Metadata } from "next";
import { PageInPreparation, PlainPage } from "@/brand/template/PlainPage";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <PlainPage label="About" title="An open British Observatory.">
      <PageInPreparation />
    </PlainPage>
  );
}
