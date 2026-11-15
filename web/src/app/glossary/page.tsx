import type { Metadata } from "next";
import { PlainPage } from "@/brand/template/PlainPage";
import { GlossaryList } from "./GlossaryList";

export const metadata: Metadata = {
  title: "Glossary",
  description: "Plain definitions for the acronyms and terms used on the British Exchange.",
};

/** The shared terms registry, grouped by sector. The Term marker on every page links here. */
export default function GlossaryPage() {
  return (
    <PlainPage label="Glossary" title="The words on the instruments.">
      <GlossaryList />
    </PlainPage>
  );
}
