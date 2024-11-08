import { Anchor, Space } from "@mantine/core";
import SnakesAndLadders from "@/components/snakesandladders";
import { Metadata } from "next";
import Header from "@/components/header";

export const metadata: Metadata = {
  title: "Snakes and Ladders",
  description: "There are snakes, there are ladders, what more could you want?",
  openGraph: {
    title: "Snakes and Ladders | Almost Yellow",
    description:
      "There are snakes, there are ladders, what more could you want?",
  },
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Games", href: "/games" },
  { title: "Snakes and Ladders", href: "" },
];

export default function SnakesAndLaddersPage() {
  return (
    <>
      <Header crumbs={crumbitems} />

      <h1>Snakes and Ladders</h1>

      <Space h="xl" />

      <SnakesAndLadders />
    </>
  );
}
