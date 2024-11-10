"use client";

import { ActionIcon, Tooltip } from "@mantine/core";
import { IconBrandGithub, IconConfetti } from "@tabler/icons-react";
import ToggleColour from "@/components/togglecolour";
import playConfetti from "@/components/playconfetti";

export default function HeaderIcons() {
  return (
    <>
      <Tooltip label="Unleash confetti" openDelay={250}>
        <ActionIcon
          onClick={playConfetti}
          variant="default"
          size="xl"
          aria-label="Unleash confetti"
        >
          <IconConfetti />
        </ActionIcon>
      </Tooltip>

      <Tooltip label="Source code" openDelay={250}>
        <ActionIcon
          component="a"
          href="https://github.com/cjrace/almostyellow"
          size="xl"
          aria-label="Open GitHub repository in a new tab"
          target="_blank"
          variant="default"
          rel="noopener noreferrer"
        >
          {<IconBrandGithub />}
        </ActionIcon>
      </Tooltip>

      <ToggleColour size="xl" />
    </>
  );
}
