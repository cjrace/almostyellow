import { Button, Title, Group, Space } from "@mantine/core";
import { Metadata } from "next";
import Header from "@/components/header";
import { signOut } from "@/auth";
import { IconShoppingCart, IconBeach } from "@tabler/icons-react";

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

      <main>
        <Title ta="center">Admin</Title>

        <Space h="xl" />

        <Group justify="center" gap="xl">
          <Button
            leftSection={<IconShoppingCart />}
            variant="default"
            component="a"
            size="xl"
            href="/admin/chopinliszt"
          >
            Chopin Liszt
          </Button>

          <Button
            leftSection={<IconBeach />}
            variant="default"
            component="a"
            size="xl"
            href="/admin/holidays"
          >
            Our holidays!
          </Button>
        </Group>

        <Space h="lg" />

        <Group justify="center">
          <Button
            onClick={async () => {
              "use server";
              await signOut();
            }}
          >
            Sign out
          </Button>
        </Group>
      </main>
    </>
  );
}
