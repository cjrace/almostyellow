"use client"; // needs to be for useMantineColorScheme

import Link from "next/link";
import {
  Group,
  Breadcrumbs,
  Anchor,
  ActionIcon,
  useMantineColorScheme,
  useComputedColorScheme,
  Tooltip,
  Menu,
} from "@mantine/core";
import {
  IconBrandGithub,
  IconConfetti,
  IconDeviceGamepad2,
  IconChevronLeft,
  IconGlass,
  IconMovie,
  IconHome,
  IconTool,
  IconMenu2,
} from "@tabler/icons-react";
import styles from "@/styles/header.module.css";
import playConfetti from "@/components/playconfetti";
import { IconMoon, IconSun } from "@tabler/icons-react";

interface BreadcrumbItem {
  title: string;
  href: string;
}

interface HeaderProps {
  crumbs?: BreadcrumbItem[];
  nativeBreadcrumbs?: boolean;
  noCrumbs?: boolean; // Put this in so we can avoid showing crumbs on home and login pages
  game?: boolean; // Back button for our games pages
  whiskyJournal?: boolean; // Back button for our whisky journal pages
  filmList?: boolean; // Back button for our film list pages
  tools?: boolean; // Back button for our tools pages
  homeOnly?: boolean; // Just show the home button
  title?: React.ReactNode; // The page's h1, centred in the header
}

export default function Header({
  crumbs,
  nativeBreadcrumbs = false,
  noCrumbs = false, // This needs to be set to true if you want to use any of the other buttons
  game = false,
  whiskyJournal = false,
  filmList = false,
  tools = false,
  homeOnly = false,
  title,
}: HeaderProps) {
  const mainJustify =
    noCrumbs && !game && !whiskyJournal && !filmList && !tools && !homeOnly
      ? "flex-end"
      : "space-between"; // This keeps the icon buttons on the right when there's no crumbs
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("dark", {
    getInitialValueInEffect: true,
  });

  return (
    <header>
      <Group
        justify={mainJustify}
        className={`${styles.bar} ${title ? styles.withTitle : ""}`}
      >
        {!noCrumbs && (
          <Group>
            <Breadcrumbs>
              {crumbs?.map((item) =>
                // Native links let beforeunload protect pending changes.
                item.href && !nativeBreadcrumbs ? (
                  <Anchor component={Link} href={item.href} key={item.href}>
                    {item.title}
                  </Anchor>
                ) : (
                  <Anchor href={item.href} key={item.href}>
                    {item.title}
                  </Anchor>
                ),
              )}
            </Breadcrumbs>
          </Group>
        )}

        {homeOnly && (
          <Tooltip label="Back to our homepage" openDelay={250}>
            <ActionIcon
              variant="default"
              component={Link}
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
              component={Link}
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
              component={Link}
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
              component={Link}
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

        {tools && (
          <Tooltip label="Back to our tools list" openDelay={250}>
            <ActionIcon
              variant="default"
              component={Link}
              href="/tools"
              size="xl"
              aria-label="Back to our tools list"
              style={{ width: 70 }}
            >
              <IconChevronLeft />
              <IconTool />
            </ActionIcon>
          </Tooltip>
        )}

        {title ? <div className={styles.title}>{title}</div> : null}

        {title ? (
          // A portrait phone has little width, so the extras fold into a menu
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon
                variant="default"
                size="xl"
                aria-label="Menu"
                className={styles.menu}
              >
                <IconMenu2 />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconConfetti size={16} />}
                onClick={playConfetti}
              >
                Unleash confetti
              </Menu.Item>
              <Menu.Item
                leftSection={
                  computedColorScheme === "dark" ? (
                    <IconSun size={16} />
                  ) : (
                    <IconMoon size={16} />
                  )
                }
                onClick={() => {
                  setColorScheme(
                    computedColorScheme === "light" ? "dark" : "light",
                  );
                }}
              >
                {computedColorScheme === "dark" ? "Light" : "Dark"} mode
              </Menu.Item>
              <Menu.Item
                component="a"
                href="https://github.com/cjrace/almostyellow"
                target="_blank"
                rel="noopener noreferrer"
                leftSection={<IconBrandGithub size={16} />}
              >
                Source code (opens in new tab)
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        ) : null}

        <Group
          h="100%"
          gap="xs"
          justify="flex-end"
          className={`${styles.tools} ${title ? styles.inlineTools : ""}`}
        >
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
              onClick={() => {
                setColorScheme(
                  computedColorScheme === "light" ? "dark" : "light",
                );
              }}
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
