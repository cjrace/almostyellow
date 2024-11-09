import Checklist from "@/components/checklist";
import { Metadata } from "next";
import Header from "@/components/header";
import { Title } from "@mantine/core";

export const metadata: Metadata = {
  title: "Chopin Liszt",
};

const crumbitems = [
  { title: "Admin", href: "/admin" },
  { title: "Chopin Liszt", href: "" },
];

export default async function ChopinLiszt() {
  return (
    <>
      <Header crumbs={crumbitems} />
      <Title mb="xl">Our Chopin Liszt</Title>
      <Checklist />
    </>
  );
}
