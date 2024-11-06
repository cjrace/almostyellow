import { Breadcrumbs, Anchor } from "@mantine/core";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Uno",
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Games", href: "/games" },
  { title: "Uno", href: "" },
].map((item, index) => (
  <Anchor href={item.href} key={index}>
    {item.title}
  </Anchor>
));

export default async function UnoPage() {
  return (
    <div>
      <Breadcrumbs>{crumbitems}</Breadcrumbs>
      <h1>Uno</h1>
      <p>Under construction...</p>
    </div>
  );
}
