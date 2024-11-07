import Checklist from "@/components/checklist";
import { Metadata } from "next";
import Header from "@/components/header";

export const metadata: Metadata = {
  title: "Chopin Liszt",
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Admin", href: "/admin" },
  { title: "Chopin Liszt", href: "" },
];

export default async function ChopinLiszt() {
  return (
    <>
      <Header crumbs={crumbitems} />
      <h1>Our Chopin Liszt</h1>
      <Checklist />
    </>
  );
}
