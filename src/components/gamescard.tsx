"use client";

import Link from "next/link";
import { Card, Text, Image, Button, Center } from "@mantine/core";

interface GamesCardProps {
  imagePath: string;
  title: string;
  description: string;
  link: string;
  linktext: string;
}

export default function GamesCard({
  imagePath,
  title,
  description,
  link,
  linktext,
}: GamesCardProps) {
  return (
    <Card
      shadow="xs"
      p="md"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--mantine-spacing-xs)",
        height: "100%",
      }}
    >
      <Center
        h={{ base: "9rem", lg: "auto" }}
        mih={{ base: "4rem", lg: "2rem" }}
        flex={{ lg: "1 1 0" }}
        style={{ containerType: "size" }}
      >
        <Image
          aria-hidden
          alt=""
          src={imagePath}
          h="100cqh"
          mah="10rem"
          w="auto"
          maw="100%"
          fit="contain"
        />
      </Center>
      <div>
        <Text fw={500}>{title}</Text>
        <Text c="dimmed">{description}</Text>
      </div>
      <Button
        variant="default"
        component={Link}
        size="md"
        href={link}
        style={{ flexShrink: 0 }}
      >
        Play {linktext}!
      </Button>
    </Card>
  );
}
