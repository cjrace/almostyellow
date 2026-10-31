import DecisionMaker from "@/components/decisionmaker";
import { pageMetadata } from "@/metadata";
import Header from "@/components/header";
import { Title, Space } from "@mantine/core";

export const metadata = pageMetadata(
  "Decision Maker",
  "The best way to make life's most important decisions.",
);

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Decision maker", href: "" },
];

export default function DecisionMakerPage() {
  return (
    <>
      <Header crumbs={crumbitems} />

      <main id="main-content">
        <Title>The Decision Maker</Title>
        <Space h="xl" />
        <DecisionMaker />
      </main>
    </>
  );
}
