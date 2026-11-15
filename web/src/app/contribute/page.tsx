import type { Metadata } from "next";
import { PageInPreparation, PlainPage } from "@/brand/template/PlainPage";

export const metadata: Metadata = { title: "Contribution" };

export default function ContributePage() {
  return (
    <PlainPage label="Contribution" title="How the Exchange is built, and how to help.">
      <PageInPreparation />
    </PlainPage>
  );
}
