import { Breadcrumbs, Anchor, Space } from "@mantine/core";
import SnakesAndLadders from "@/components/snakesandladders";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Snakes and Ladders",
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Games", href: "/games" },
  { title: "Snakes and Ladders", href: "" },
].map((item, index) => (
  <Anchor href={item.href} key={index}>
    {item.title}
  </Anchor>
));

export default function SnakesAndLaddersPage() {
  return (
    <>
      <Breadcrumbs>{crumbitems}</Breadcrumbs>
      <h1>Snakes and Ladders</h1>

      <Space h="xl" />

      <SnakesAndLadders />
    </>
  );
}
