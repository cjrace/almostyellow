import { Breadcrumbs, Anchor } from "@mantine/core";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Admin", href: "" },
].map((item, index) => (
  <Anchor href={item.href} key={index}>
    {item.title}
  </Anchor>
));

export default async function Admin() {
  return (
    <>
      <Breadcrumbs>{crumbitems}</Breadcrumbs>

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
