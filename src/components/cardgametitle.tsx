"use client";

import { useState } from "react";
import { useMounted } from "@mantine/hooks";
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
  creditLink?: string; // Where Ben published the game, if he did
}

// Title, instructions and credit for Ben Palmer's card games
export default function CardGameTitle({
  title,
  children,
  creditLink,
}: CardGameTitleProps) {
  const [modalInstructionsOpened, setModalInstructionsOpened] = useState(false);
  const mounted = useMounted();

  return (
    <>
      <Group gap="xs">
        <Title
          fz={{
            base: "var(--mantine-h2-font-size)",
            sm: "var(--mantine-h1-font-size)",
          }}
        >
          {title}
        </Title>
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
            onClick={(event) => {
              // Safari does not focus buttons on a tap; remember this opener.
              event.currentTarget.focus();
              setModalInstructionsOpened(true);
            }}
          >
            <IconInfoCircle />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Text c="dimmed" mt={4}>
        {creditLink ? (
          <Anchor
            href={creditLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="A Ben Palmer original (opens in new tab)"
          >
            A Ben Palmer original
          </Anchor>
        ) : (
          "A Ben Palmer original"
        )}
      </Text>

      {/* Built from parts so Modal.Title can name the dialog without the
          default header and close button */}
      <Modal.Root
        // Include hidden rules in server HTML, then use the normal portal.
        keepMounted
        withinPortal={mounted}
        keepMountedMode={mounted ? "activity" : "display-none"}
        size="auto"
        opened={modalInstructionsOpened}
        onClose={() => {
          setModalInstructionsOpened(false);
        }}
        transitionProps={{
          transition: "fade",
          duration: 300,
          timingFunction: "linear",
        }}
      >
        <Modal.Overlay backgroundOpacity={0.75} blur={3} />
        <Modal.Content>
          <Modal.Body>
            <Container>
              <Modal.Title fz="h2" fw={700} lh="h2" mb="sm">
                {title} instructions
              </Modal.Title>
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
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>
    </>
  );
}
