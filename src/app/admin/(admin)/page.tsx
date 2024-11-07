import { Anchor } from "@mantine/core";
import { Metadata } from "next";
import Header from "@/components/header";

export const metadata: Metadata = {
  title: "Admin",
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Admin", href: "" },
];

export default async function Admin() {
  return (
    <>
      <Header crumbs={crumbitems} />

      <h1>Welcome to our admin page</h1>

      <ul>
        <li>
          <Anchor href="/admin/chopinliszt">Chopin Liszt</Anchor>
        </li>
        <li>
          <Anchor href="/admin">???</Anchor>
        </li>
        <li>
          <Anchor href="/admin">???</Anchor>
        </li>
      </ul>
    </>
  );
}
