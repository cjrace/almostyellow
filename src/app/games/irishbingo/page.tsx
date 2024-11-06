import { Breadcrumbs, Anchor, Space } from "@mantine/core";
import IrishBingo from "@/components/irishbingo";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Irish Bingo",
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Games", href: "/games" },
  { title: "Irish Bingo", href: "" },
].map((item, index) => (
  <Anchor href={item.href} key={index}>
    {item.title}
  </Anchor>
));

export default function IrishBingoPage() {
  return (
    <>
      <Breadcrumbs>{crumbitems}</Breadcrumbs>
      <h1>Irish Bingo</h1>

      <Space h="xl" />

      <IrishBingo />
    </>
  );
}