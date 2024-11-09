"use client";

import {
  ActionIcon,
  useMantineColorScheme,
  useComputedColorScheme,
} from "@mantine/core";
import { IconSun, IconMoon } from "@tabler/icons-react";
import { useEffect } from "react";

interface ToggleColourProps {
  size?: string;
}

export default function ToggleColour({ size }: ToggleColourProps) {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light");
  const toggleColorScheme = () => {
    setColorScheme(computedColorScheme === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    document.body.setAttribute("data-theme", colorScheme);
  }, [colorScheme]);

  return (
    <ActionIcon
      onClick={toggleColorScheme}
      variant="default"
      size={size}
      aria-label="Toggle color scheme"
    >
      {colorScheme === "light" ? (
        <IconSun stroke={1.5} />
      ) : (
        <IconMoon stroke={1.5} />
      )}
    </ActionIcon>
  );
}
