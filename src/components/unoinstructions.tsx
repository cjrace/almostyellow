"use client";

import { createContext, use, useState } from "react";
import { ActionIcon, Group, Title, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

interface UnoInstructionsState {
  opened: boolean;
  setOpened: (opened: boolean) => void;
}

const UnoInstructionsContext = createContext<UnoInstructionsState>({
  opened: false,
  setOpened: () => undefined,
});

// The instructions are opened from the page's title, which sits in the site
// header, and shown by the game, so the two share whether they are open
export function UnoInstructionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [opened, setOpened] = useState(false);
  return (
    <UnoInstructionsContext value={{ opened, setOpened }}>
      {children}
    </UnoInstructionsContext>
  );
}

export function useUnoInstructions() {
  return use(UnoInstructionsContext);
}

// The page's h1, with the instructions button beside it like the other games.
// On a phone held sideways the header is hidden and the table's own strip has
// a button instead.
export function UnoTitle() {
  const { setOpened } = useUnoInstructions();
  return (
    <Group gap="xs" wrap="nowrap" justify="center">
      <Title>Uno</Title>
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
            setOpened(true);
          }}
        >
          <IconInfoCircle />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
