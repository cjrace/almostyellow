import { Space, Title } from "@mantine/core";
import IrishBingo from "@/components/irishbingo";
import { Metadata } from "next";
import Header from "@/components/header";

export const metadata: Metadata = {
  title: "Irish Bingo",
  description: "The most fun you can have with a pack of cards.",
  openGraph: {
    title: "Irish Bingo | Almost Yellow",
    description: "The most fun you can have with a pack of cards.",
  },
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Games", href: "/games" },
  { title: "Irish Bingo", href: "" },
];

export default function IrishBingoPage() {
  return (
    <>
      <Header crumbs={crumbitems} />
      <Title>Irish Bingo</Title>
      <Space h="xl" />
      <IrishBingo />
    </>
  );
}
