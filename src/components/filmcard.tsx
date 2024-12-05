import { Paper, Text, Badge, Group, ActionIcon, Flex } from "@mantine/core";
import { IconChecklist, IconEyeglass, IconPencil } from "@tabler/icons-react";
import { PiJarBold } from "react-icons/pi";

export interface Film {
  id: string;
  name: string;
  release_year: number;
  watched: boolean;
  top_30: boolean;
  not_in_jar: boolean;
}

export const FilmCard: React.FC<Film> = ({
  id,
  name,
  release_year,
  watched,
  top_30,
  not_in_jar,
}) => {
  return (
    <Paper shadow="md" radius="lg" withBorder p="lg" mb="sm">
      <Flex justify="space-between" direction={{ base: "column", sm: "row" }}>
        <Group mb="sm">
          <Text>
            {name} ({release_year})
          </Text>
        </Group>

        <Group>
          <ActionIcon
            size="lg"
            variant="default"
            component="a"
            href={`/admin/films/${id}/edit`}
            aria-label="Edit film"
          >
            {<IconPencil />}
          </ActionIcon>

          {top_30 && (
            <Badge color="yellow" size="lg" leftSection={<IconChecklist />}>
              <Text display={{ base: "none", sm: "inline" }}>IMDB top 30</Text>
              <Text display={{ base: "inline", sm: "none" }}>Top 30</Text>
            </Badge>
          )}

          {watched && (
            <Badge color="green" size="lg" leftSection={<IconEyeglass />}>
              <Text display={{ base: "none", sm: "inline" }}>Watched</Text>
            </Badge>
          )}

          {not_in_jar && (
            <Badge color="red" size="lg" leftSection={<PiJarBold />}>
              Add to jar
            </Badge>
          )}
        </Group>
      </Flex>
    </Paper>
  );
};
