import { Anchor, Button, Title } from "@mantine/core";
import { Metadata } from "next";
import Header from "@/components/header";
import { signOut } from "@/auth";

export const metadata: Metadata = {
  title: "Admin",
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Admin", href: "" },
];

export default function Admin() {
  return (
    <>
      <Header crumbs={crumbitems} />

      <Title>Welcome to our admin page</Title>

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

      <Button
        onClick={async () => {
          "use server";
          await signOut();
        }}
      >
        Sign out
      </Button>
    </>
  );
}
