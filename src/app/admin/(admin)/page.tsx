import { Title, Group, Space } from "@mantine/core";
import { Metadata } from "next";
import Header from "@/components/header";
import ButtonLink from "@/components/buttonlink";
import { SignOutButton } from "@/components/SignOutButton";
import {
  IconShoppingCart,
  IconBeach,
  IconGlass,
  IconMovie,
} from "@tabler/icons-react";

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

      <main id="main-content">
        <Title ta="center">Admin</Title>

        <Space h="xl" />

        <Group justify="center" gap="xl">
          <ButtonLink
            leftSection={<IconShoppingCart />}
            variant="default"
            size="xl"
            href="/admin/chopinliszt"
          >
            Chopin Liszt
          </ButtonLink>

          <ButtonLink
            leftSection={<IconBeach />}
            variant="default"
            size="xl"
            href="/admin/holidays"
          >
            Our holidays!
          </ButtonLink>

          <ButtonLink
            leftSection={<IconGlass />}
            variant="default"
            size="xl"
            href="/admin/whiskyjournal/add"
          >
            Add new whisky
          </ButtonLink>

          <ButtonLink
            leftSection={<IconMovie />}
            variant="default"
            size="xl"
            href="/admin/films/add"
          >
            Add new film
          </ButtonLink>
        </Group>

        <Space h="lg" />

        <SignOutButton />
      </main>
    </>
  );
}
