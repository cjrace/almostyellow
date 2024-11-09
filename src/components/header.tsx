import { Group, ActionIcon, Breadcrumbs, Anchor } from "@mantine/core";
import { IconBrandGithub, IconConfetti } from "@tabler/icons-react";
import ToggleColour from "@/components/togglecolour";
import playConfetti from "@/components/playconfetti";

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
          <ActionIcon
            onClick={playConfetti}
            variant="default"
            size="xl"
            aria-label="Fire confetti canons"
          >
            <IconConfetti />
          </ActionIcon>

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

          <ToggleColour size="xl" />
        </Group>
      </Group>
    </header>
  );
}
