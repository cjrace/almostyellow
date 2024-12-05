import {
  Paper,
  Title,
  Text,
  Badge,
  Divider,
  Rating,
  Group,
  ActionIcon,
} from "@mantine/core";
import { PiGrains } from "react-icons/pi";
import { FaMapMarkerAlt } from "react-icons/fa";
import {
  IconBarrel,
  IconBuildingFactory,
  IconTaxPound,
  IconPencil,
} from "@tabler/icons-react";

export interface Whisky {
  whisky_id: string;
  name: string;
  distillery: string;
  country_region: string;
  age: number;
  grain: string;
  abv: number;
  last_edited: Date;
  rating: number;
  price: number;
  notes: string;
}

export const WhiskyCard: React.FC<Whisky> = ({
  whisky_id,
  name,
  distillery,
  country_region,
  age,
  grain,
  abv,
  last_edited,
  rating,
  price,
  notes,
}) => {
  return (
    <Paper shadow="md" radius="lg" withBorder p="lg" mb="sm">
      <Group justify="space-between">
        <Title order={2}>{name}</Title>

        <Group>
          <Rating value={rating} readOnly size="lg" />
          <ActionIcon
            size="lg"
            variant="default"
            component="a"
            href={`/admin/whiskyjournal/${whisky_id}/edit`}
            aria-label="Edit whisky"
          >
            {<IconPencil />}
          </ActionIcon>
        </Group>
      </Group>

      <Group mt="md">
        <Badge variant="default" size="lg" leftSection={<PiGrains />}>
          {grain}
        </Badge>
        <Badge variant="default" size="lg" leftSection="ABV:">
          {abv}%
        </Badge>
        <Badge
          variant="default"
          size="lg"
          leftSection={<IconBuildingFactory />}
        >
          {distillery}
        </Badge>
        <Badge variant="default" size="lg" leftSection={<FaMapMarkerAlt />}>
          {country_region}
        </Badge>
        <Badge variant="default" size="lg" leftSection={<IconBarrel />}>
          {age === 0 ? "No age statement" : `${age} years`}
        </Badge>

        <Rating
          value={price}
          count={3}
          readOnly
          emptySymbol={<IconTaxPound size="2rem" style={{ opacity: 0.2 }} />}
          fullSymbol={<IconTaxPound size="2rem" />}
        />
      </Group>

      <Divider variant="dotted" my="md" />

      <Group justify="space-between">
        <Title order={3}>Tasting notes</Title>
        <Text>Last edited: {last_edited.toLocaleDateString()}</Text>
      </Group>

      <Text>{notes}</Text>
    </Paper>
  );
};
