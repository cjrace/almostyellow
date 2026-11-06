"use client";

import Link from "next/link";
import NextImage from "next/image";
import {
  Card,
  Text,
  Image,
  Button,
  Flex,
  Group,
  Box,
  Badge,
} from "@mantine/core";

interface GamesCardProps {
  imagePath: string;
  title: string;
  description: string;
  link: string;
  linktext: string;
  experimental?: boolean;
}

export default function GamesCard({
  imagePath,
  title,
  description,
  link,
  linktext,
  experimental,
}: GamesCardProps) {
  return (
    <Card component="article" shadow="xs" p="sm" h="100%">
      <Flex
        direction={{ base: "column", md: "row" }}
        align={{ base: "stretch", md: "center" }}
        gap="sm"
        h="100%"
      >
        <Group wrap="nowrap" gap="sm" flex={1} miw={0}>
          <Image
            component={NextImage}
            width={40}
            height={40}
            sizes="40px"
            aria-hidden
            alt=""
            src={imagePath}
            h={40}
            w={40}
            fit="contain"
            style={{ flexShrink: 0 }}
          />
          <Box miw={0}>
            <Group gap="xs">
              <Text component="h2" size="md" fw={500}>
                {title}
              </Text>
              {experimental && (
                <Badge variant="outline" size="sm">
                  Experimental
                </Badge>
              )}
            </Group>
            <Text size="sm" c="dimmed">
              {description}
            </Text>
          </Box>
        </Group>
        <Button
          variant="default"
          component={Link}
          size="sm"
          href={link}
          w={{ base: "100%", md: 146 }}
          h={44}
          px="xs"
          style={{ flexShrink: 0 }}
          styles={{ label: { whiteSpace: "normal" } }}
        >
          Play {linktext}!
        </Button>
      </Flex>
    </Card>
  );
}
