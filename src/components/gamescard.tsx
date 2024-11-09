"use client";

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
      p="xl"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
      }}
    >
      <Card.Section>
        <Center>
          <Image aria-hidden src={imagePath} h={200} w="auto" fit="contain" />
        </Center>
      </Card.Section>
      <div style={{ flex: "1" }}>
        {" "}
        {/*This helps keep titles aligned across cards*/}
        <Text fw={500} mt="md">
          {title}
        </Text>
        <Text mt="xs" c="dimmed">
          {description}
        </Text>
      </div>
      <Button
        variant="default"
        component="a"
        size="md"
        mt="md"
        href={link}
        style={{ marginTop: "auto" }} //This helps keep buttons aligned across cards
      >
        Play {linktext}!
      </Button>
    </Card>
  );
}
