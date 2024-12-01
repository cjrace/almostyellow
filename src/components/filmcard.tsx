import { Paper, Title, Badge, Group, ActionIcon } from "@mantine/core";
import { IconChecklist, IconEyeglass, IconPencil } from "@tabler/icons-react";
import { PiJarBold } from "react-icons/pi";

export const filmData = [
  {
    name: "Saving Private Ryan",
    release_year: 1998,
    watched: true,
    top_30: true,
    not_in_jar: false,
  },
  {
    name: "2001: A Space Odyssey",
    release_year: 1968,
    watched: true,
    top_30: false,
    not_in_jar: false,
  },
  {
    name: "Chaplin",
    release_year: 1992,
    watched: false,
    top_30: false,
    not_in_jar: true,
  },
];

export interface Film {
  name: string;
  release_year: number;
  watched: boolean;
  top_30: boolean;
  not_in_jar: boolean;
}

export const FilmCard: React.FC<Film> = ({
  name,
  release_year,
  watched,
  top_30,
  not_in_jar,
}) => {
  return (
    <Paper shadow="md" radius="lg" withBorder p="lg" mb="sm">
      <Group justify="space-between">
        <Group>
          <Title order={2}>
            {name} ({release_year})
          </Title>
        </Group>

        <Group>
          {top_30 && (
            <Badge color="yellow" size="xl" leftSection={<IconChecklist />}>
              IMDB top 30
            </Badge>
          )}

          {watched && (
            <Badge color="green" size="xl" leftSection={<IconEyeglass />}>
              Watched
            </Badge>
          )}

          {not_in_jar && (
            <Badge color="red" size="xl" leftSection={<PiJarBold />}>
              Add to jar
            </Badge>
          )}

          <ActionIcon
            size="lg"
            variant="default"
            component="a"
            href="/admin/film/edit"
          >
            {<IconPencil />}
          </ActionIcon>
        </Group>
      </Group>
    </Paper>
  );
};
