import DecisionMaker from "@/components/decisionmaker";
import { Metadata } from "next";
import Header from "@/components/header";

export const metadata: Metadata = {
  title: "Decision Maker",
  description: "The best way to make life's most important decisions.",
  openGraph: {
    title: "Decision Maker | Almost Yellow",
    description: "The best way to make life's most important decisions.",
  },
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Decision maker", href: "" },
];

export default function DecisionMakerPage() {
  return (
    <>
      <Header crumbs={crumbitems} />
      <h1>The Decision Maker</h1>

      <DecisionMaker />
    </>
  );
}
