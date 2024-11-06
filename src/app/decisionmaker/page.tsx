import { Breadcrumbs, Anchor } from "@mantine/core";
import DecisionMaker from "@/components/decisionmaker";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Decision Maker",
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Decision maker", href: "" },
].map((item, index) => (
  <Anchor href={item.href} key={index}>
    {item.title}
  </Anchor>
));

export default function DecisionMakerPage() {
  return (
    <>
      <Breadcrumbs>{crumbitems}</Breadcrumbs>
      <h1>The Decision Maker</h1>

      <DecisionMaker />
    </>
  );
}
