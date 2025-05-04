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
import {
  IconBrandGithub,
  IconConfetti,
  IconDeviceGamepad2,
  IconChevronLeft,
  IconGlass,
  IconMovie,
  IconHome,
} from "@tabler/icons-react";
import playConfetti from "@/components/playconfetti";
import { IconMoon, IconSun } from "@tabler/icons-react";

interface BreadcrumbItem {
  title: string;
  href: string;
}

interface HeaderProps {
  crumbs?: BreadcrumbItem[];
  noCrumbs?: boolean; // Put this in so we can avoid showing crumbs on home and login pages
  game?: boolean; // Back button for our games pages
  whiskyJournal?: boolean; // Back button for our whisky journal pages
  filmList?: boolean; // Back button for our film list pages
  homeOnly?: boolean; // Just show the home button
}

export default function Header({
  crumbs,
  noCrumbs = false, // This needs to be set to true if you want to use any of the other buttons
  game = false,
  whiskyJournal = false,
  filmList = false,
  homeOnly = false,
}: HeaderProps) {
  const mainJustify =
    noCrumbs && !game && !whiskyJournal && !filmList && !homeOnly
      ? "flex-end"
      : "space-between"; // This keeps the icon buttons on the right when there's no crumbs
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

        {homeOnly && (
          <Tooltip label="Back to our homepage" openDelay={250}>
            <ActionIcon
              variant="default"
              component="a"
              href="/"
              size="xl"
              aria-label="Back to our homepage"
              style={{ width: 70 }}
            >
              <IconChevronLeft />
              <IconHome />
            </ActionIcon>
          </Tooltip>
        )}

        {game && (
          <Tooltip label="Back to our games list" openDelay={250}>
            <ActionIcon
              variant="default"
              component="a"
              href="/games"
              size="xl"
              aria-label="Back to our games list"
              style={{ width: 70 }}
            >
              <IconChevronLeft />
              <IconDeviceGamepad2 />
            </ActionIcon>
          </Tooltip>
        )}

        {whiskyJournal && (
          <Tooltip label="Back to Cam's whisky journal" openDelay={250}>
            <ActionIcon
              variant="default"
              component="a"
              href="/whiskyjournal"
              size="xl"
              aria-label="Back to Cam's whisky journal"
              style={{ width: 70 }}
            >
              <IconChevronLeft />
              <IconGlass />
            </ActionIcon>
          </Tooltip>
        )}

        {filmList && (
          <Tooltip label="Back to Cam's film list" openDelay={250}>
            <ActionIcon
              variant="default"
              component="a"
              href="/films"
              size="xl"
              aria-label="Back to Cam's film list"
              style={{ width: 70 }}
            >
              <IconChevronLeft />
              <IconMovie />
            </ActionIcon>
          </Tooltip>
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
                style={{
                  display: computedColorScheme === "dark" ? "none" : "inline",
                }}
              />
              <IconMoon
                suppressHydrationWarning={true}
                style={{
                  display: computedColorScheme === "light" ? "none" : "inline",
                }}
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
