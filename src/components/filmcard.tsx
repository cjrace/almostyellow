import { Paper, Title, Badge, Group } from "@mantine/core";
import { IconChecklist, IconEyeglass } from "@tabler/icons-react";

export const filmData = [
  {
    name: "Saving Private Ryan",
    release_year: 1998,
    watched: true,
    top_30: true,
  },
  {
    name: "2001: A Space Odyssey",
    release_year: 1968,
    watched: true,
    top_30: false,
  },
];

export interface Film {
  name: string;
  release_year: number;
  watched: boolean;
  top_30: boolean;
}

export const FilmCard: React.FC<Film> = ({
  name,
  release_year,
  watched,
  top_30,
}) => {
  return (
    <Paper shadow="md" radius="lg" withBorder p="lg" mb="sm">
      <Group justify="space-between">
        <Title order={2}>
          {name} ({release_year})
        </Title>

        <Group>
          {top_30 && (
            <Badge variant="default" size="xl" leftSection={<IconChecklist />}>
              IMDB top 30
            </Badge>
          )}

          {watched && (
            <Badge variant="default" size="xl" leftSection={<IconEyeglass />}>
              Watched
            </Badge>
          )}
        </Group>
      </Group>
    </Paper>
  );
};
