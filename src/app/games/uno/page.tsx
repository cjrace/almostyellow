import { Metadata } from "next";
import Header from "@/components/header";

export const metadata: Metadata = {
  title: "Uno",
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Games", href: "/games" },
  { title: "Uno", href: "/games/uno" },
];

export default async function UnoPage() {
  return (
    <>
      <Header crumbs={crumbitems} />
      <h1>Uno</h1>
      <p>Under construction...</p>
    </>
  );
}
