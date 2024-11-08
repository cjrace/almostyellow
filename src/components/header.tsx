import { Group, ActionIcon, Breadcrumbs, Anchor } from "@mantine/core";
import { IconBrandGithub, IconConfetti } from "@tabler/icons-react";
import ToggleColour from "@/components/togglecolour";
import playConfetti from "@/components/playconfetti";

interface BreadcrumbItem {
  title: string;
  href: string;
}

interface HeaderProps {
  crumbs: BreadcrumbItem[];
}

export default function Header({ crumbs }: HeaderProps) {
  return (
    <Group justify="space-between">
      <Group>
        <Breadcrumbs>
          {crumbs?.map((item, index) => (
            <Anchor href={item.href} key={index}>
              {item.title}
            </Anchor>
          ))}
        </Breadcrumbs>
      </Group>

      <Group h="100%" px="md" justify="flex-end">
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
        <ToggleColour />
      </Group>
    </Group>
  );
}
