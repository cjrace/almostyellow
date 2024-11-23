// import { v4 as generate_uuid } from "uuid";
// import styles from "@/styles/whiskybox.module.css";
import {
  Paper,
  Title,
  Text,
  Badge,
  Divider,
  Rating,
  Group,
} from "@mantine/core";
import { PiGrains } from "react-icons/pi";
import { FaMapMarkerAlt } from "react-icons/fa";
import {
  IconBarrel,
  IconBuildingFactory,
  IconCurrencyPound,
  IconTaxPound,
} from "@tabler/icons-react";

export const whiskyData = [
  {
    whisky_id: "27456289-7019-498b-915d-4c5173133ffe", // generate_uuid(),
    name: "Talisker 10 Year Old",
    distillery: "Talisker",
    country_region: "Highland - Scotland", // Scotland has 5 regions, everywhere else is by country
    age: 10, // numbers or 'No age statement' if blank
    grain: "Single malt", // or "Rye", "Bourbon", "Blend"
    abv: 45.8, // %
    last_edited: new Date("2024/11/23"), // auto generate when writing to db
    rating: 5, // Need to do a write up of what 1-5 means
    price: 2, // Roughly, 1 = Under £30 a bottle, 2 = £30-75, 3 = £75+
    notes: "Something about the look, nose, palette and finish",
  },
  {
    whisky_id: "27456289-7019-498b-915d-4c5173133fdd", // generate_uuid(),
    name: "Johnnie Walker Double Black",
    distillery: "Johnnie Walker",
    country_region: "Mixed - Scotland", // Scotland has 5 regions, everywhere else is by country
    age: 0, // numbers or 'No age statement' if blank
    grain: "Blend", // or "Rye", "Bourbon", "Blend"
    abv: 40, // %
    last_edited: new Date("2024/11/22"), // auto generate when writing to db
    rating: 3, // Need to do a write up of what 1-5 means
    price: 2, // Roughly, 1 = Under £40 a bottle, 2 = £40-80, 3 = £80+
    notes: "Best smoky mixer!",
  },
];

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
