import { Space } from "@mantine/core";
import IrishBingo from "@/components/irishbingo";
import { Metadata } from "next";
import Header from "@/components/header";

export const metadata: Metadata = {
  title: "Irish Bingo",
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
      <h1>Irish Bingo</h1>

      <Space h="xl" />

      <IrishBingo />
    </>
  );
}
