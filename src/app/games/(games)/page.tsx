import { Anchor } from "@mantine/core";
import { Metadata } from "next";
import Header from "@/components/header";

export const metadata: Metadata = {
  title: "Games",
  description: "Our collection of online games.",
  openGraph: {
    title: "Games | Almost Yellow",
    description: "Our collection of online games.",
  },
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Games", href: "" },
];

export default async function Games() {
  return (
    <>
      <Header crumbs={crumbitems} />

      <h1>Our games</h1>

      <ul>
        <li>
          <Anchor href="/games/irishbingo">Irish bingo</Anchor>
        </li>
        <li>
          <Anchor href="/games/snakesandladders">Snakes and Ladders</Anchor>
        </li>
        <li>
          <Anchor href="/games/uno">Uno</Anchor>
        </li>
      </ul>
    </>
  );
}
