"use client"; // needs to be for useMantineColorScheme

import {
  Group,
  Breadcrumbs,
  Anchor,
  ActionIcon,
  useMantineColorScheme,
  useComputedColorScheme,
  Tooltip,
} from "@mantine/core";
import { IconBrandGithub, IconConfetti } from "@tabler/icons-react";
import playConfetti from "@/components/playconfetti";
import { IconMoon, IconSun } from "@tabler/icons-react";
import cx from "clsx";
import classes from "@/styles/togglecolour.module.css";

interface BreadcrumbItem {
  title: string;
  href: string;
}

interface HeaderProps {
  crumbs?: BreadcrumbItem[];
  noCrumbs?: boolean; // Put this in so we can avoid showing crumbs on home and login pages
}

export default function Header({ crumbs, noCrumbs = false }: HeaderProps) {
  const mainJustify = noCrumbs ? "flex-end" : "space-between"; // This keeps the icon buttons on the right when there's no crumbs
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("dark", {
    getInitialValueInEffect: true,
  });

  return (
    <header>
      <Group justify={mainJustify} mb={20}>
        {!noCrumbs && (
          <Group>
            <Breadcrumbs>
              {crumbs?.map((item, index) => (
                <Anchor href={item.href} key={index}>
                  {item.title}
                </Anchor>
              ))}
            </Breadcrumbs>
          </Group>
        )}

        <Group h="100%" gap="xs" justify="flex-end">
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

          <Tooltip
            label={`${computedColorScheme === "dark" ? "Light" : "Dark"} mode`}
            openDelay={250}
          >
            <ActionIcon
              onClick={() =>
                setColorScheme(
                  computedColorScheme === "light" ? "dark" : "light",
                )
              }
              variant="default"
              size="xl"
              aria-label="Toggle color scheme"
            >
              <IconSun
                suppressHydrationWarning={true}
                // Ignoring hydration warning as would rather it rerender server side if the toggle has been changed
                // Alternative I had was a client side load of the icon but that was noticeably slower / icon would appear on delay
                className={cx(computedColorScheme == "dark" && classes.hide)}
              />
              <IconMoon
                suppressHydrationWarning={true}
                className={cx(computedColorScheme == "light" && classes.hide)}
              />
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
        </Group>
      </Group>
    </header>
  );
}
