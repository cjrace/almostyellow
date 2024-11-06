import Checklist from "@/components/checklist";
import { Breadcrumbs, Anchor } from "@mantine/core";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chopin Liszt",
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Admin", href: "/admin" },
  { title: "Chopin Liszt", href: "" },
].map((item, index) => (
  <Anchor href={item.href} key={index}>
    {item.title}
  </Anchor>
));

export default async function ChopinLiszt() {
  return (
    <>
      <Breadcrumbs>{crumbitems}</Breadcrumbs>

      <h1>Our Chopin Liszt</h1>
      <Checklist />
    </>
  );
}
