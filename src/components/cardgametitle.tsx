"use client";

import { useState } from "react";
import {
  ActionIcon,
  Anchor,
  Button,
  Center,
  Container,
  Group,
  Modal,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

interface CardGameTitleProps {
  title: string;
  children: React.ReactNode; // The instructions
}

// Title, instructions and credit for Ben Palmer's card games
export default function CardGameTitle({ title, children }: CardGameTitleProps) {
  const [modalInstructionsOpened, setModalInstructionsOpened] = useState(false);
  const instructionsId = `${title.toLowerCase().replace(/\W+/g, "_")}_instructions`;

  return (
    <>
      <Group gap="xs">
        <Title>{title}</Title>
        <Tooltip
          label="Game instructions"
          openDelay={250}
          position="right"
          offset={5}
        >
          <ActionIcon
            variant="subtle"
            size="lg"
            aria-label="Open game instructions modal"
            onClick={() => {
              setModalInstructionsOpened(true);
            }}
          >
            <IconInfoCircle />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Text c="dimmed" mt={4}>
        <Anchor
          href="https://github.com/BenjaminJPalmer/red-or-black-v1"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="A Ben Palmer original (opens in new tab)"
        >
          A Ben Palmer original
        </Anchor>
      </Text>

      <Modal
        size="auto"
        opened={modalInstructionsOpened}
        onClose={() => {
          setModalInstructionsOpened(false);
        }}
        aria-labelledby={instructionsId}
        withCloseButton={false}
        transitionProps={{
          transition: "fade",
          duration: 300,
          timingFunction: "linear",
        }}
        overlayProps={{
          backgroundOpacity: 0.75,
          blur: 3,
        }}
      >
        <Container>
          <Title order={2} mb="sm" id={instructionsId}>
            {title} instructions
          </Title>
          {children}
          <Center>
            <Button
              variant="subtle"
              mt="md"
              onClick={() => {
                setModalInstructionsOpened(false);
              }}
            >
              Close instructions modal
            </Button>
          </Center>
        </Container>
      </Modal>
    </>
  );
}
