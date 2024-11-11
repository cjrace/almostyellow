"use client"; // TODO: Not sure this should be needed.

import { Title, Text, Timeline, List, Grid, Container } from "@mantine/core";
import {
  IconSun,
  IconShip,
  IconSnowflake,
  IconCar,
  IconGift,
  IconMoodSurprised,
  IconBriefcase,
} from "@tabler/icons-react";

export default function HolidayTimeline() {
  return (
    <>
      <Title order={2} my="md">
        2024
      </Title>

      <Timeline color="yellow" active={5} bulletSize={24} lineWidth={2}>
        <Timeline.Item
          title="Christmas Schtarshh"
          bullet={<IconGift size="1rem" />}
        >
          <Text c="dimmed" size="sm">
            No stars but kitchen roll kebabs
          </Text>
          <List>
            <List.Item>Wild Northumberland glamping, Hexham</List.Item>
          </List>
          <Text size="xs" mt={4}>
            26th January - 27th January 2024
          </Text>
        </Timeline.Item>

        <Timeline.Item
          title="Neath - Bristol - Bath"
          bullet={<IconBriefcase size="1rem" />}
        >
          <Text c="dimmed" size="sm">
            Strange Neath hotel, tasty cider and a speedy bath
          </Text>
          <List>
            <List.Item>Neath</List.Item>
            <List.Item>Bristol</List.Item>
            <List.Item>Bath</List.Item>
          </List>
          <Text size="xs" mt={4}>
            15th March - 16th March 2024
          </Text>
        </Timeline.Item>

        <Timeline.Item title="Bulgaria" bullet={<IconSun size="1rem" />}>
          <Text c="dimmed" size="sm">
            Being fancy with the old leathery people
          </Text>
          <List>
            <List.Item>Sunny beach, Bulgaria</List.Item>
          </List>
          <Text size="xs" mt={4}>
            9th June - 16th June 2024
          </Text>
        </Timeline.Item>

        <Timeline.Item
          title="Laura's birthday"
          bullet={<IconGift size="1rem" />}
        >
          <Text c="dimmed" size="sm">
            Golf x2, fancy Green Egg cabin, meerkats and getting engaged!
          </Text>
          <List>
            <List.Item>Lebberston</List.Item>
          </List>
          <Text size="xs" mt={4}>
            7th July - 9th July 2024
          </Text>
        </Timeline.Item>

        <Timeline.Item title="Cam's birthday" bullet={<IconGift size="1rem" />}>
          <Text c="dimmed" size="sm">
            Bottomless brunch, batting cage and escape room
          </Text>
          <List>
            <List.Item>York</List.Item>
          </List>
          <Text size="xs" mt={4}>
            9th August - 11th August 2024
          </Text>
        </Timeline.Item>

        <Timeline.Item
          title="Surprise! Holy Island"
          bullet={<IconMoodSurprised size="1rem" />}
        >
          <Text c="dimmed" size="sm">
            Clinking our G&Ts through the graveyard
          </Text>
          <List>
            <List.Item>Lindisfarne (Holy Island)</List.Item>
          </List>
          <Text size="xs" mt={4}>
            27th September - 29th September 2024
          </Text>
        </Timeline.Item>

        <Timeline.Item title="CROOOOSMAS" bullet={<IconShip size="1rem" />}>
          <Text c="dimmed" size="sm">
            Cruisin&apos; the Christmas markets in
          </Text>
          <List>
            <List.Item>Zeebrugge, Belgium</List.Item>
            <List.Item>Amsterdam, Netherlands</List.Item>
          </List>
          <Text size="xs" mt={4}>
            14 December - 19 December 2024
          </Text>
        </Timeline.Item>
      </Timeline>

      <Title order={2} my="md">
        2023
      </Title>

      <Timeline color="yellow" active={4} bulletSize={24} lineWidth={2}>
        <Timeline.Item
          title="Sparkly sky"
          bullet={<IconSnowflake size="1rem" />}
        >
          <Text c="dimmed" size="sm">
            Man chop wood in the arctic circle
          </Text>
          <List>
            <List.Item>Lofoten, Norway</List.Item>
          </List>
          <Text size="xs" mt={4}>
            3rd January - 8th January 2023
          </Text>
        </Timeline.Item>

        <Timeline.Item title="North coast 500" bullet={<IconCar size="1rem" />}>
          <Text c="dimmed" size="sm">
            A Scottish loop this time
          </Text>
          <List>
            <List.Item>Scotland</List.Item>
          </List>
          <Text size="xs" mt={4}>
            1st May - 8th May 2023
          </Text>
        </Timeline.Item>

        <Timeline.Item
          title="Laura's birthday"
          bullet={<IconGift size="1rem" />}
        >
          <Text c="dimmed" size="sm">
            Bell tent storm, fire pit pizza oven and Yorkshire Wildlife Park
          </Text>
          <List>
            <List.Item>Catgill farm, Skipton</List.Item>
          </List>
          <Text size="xs" mt={4}>
            9th July - 10th July 2023
          </Text>
        </Timeline.Item>

        <Timeline.Item title="Cam's birthday" bullet={<IconGift size="1rem" />}>
          <Text c="dimmed" size="sm">
            Being impeccable piggies
          </Text>
          <List>
            <List.Item>The impeccable pig, Sedgefield</List.Item>
          </List>
          <Text size="xs" mt={4}>
            7th August - 8th August 2023
          </Text>
        </Timeline.Item>

        <Timeline.Item title="Gr-EES" bullet={<IconSun size="1rem" />}>
          <Text c="dimmed" size="sm">
            Our first all inclusive
          </Text>
          <List>
            <List.Item>Kos, Greece</List.Item>
          </List>
          <Text size="xs" mt={4}>
            6th September - 10th September 2023
          </Text>
        </Timeline.Item>
      </Timeline>

      <Title order={2} my="md">
        2022
      </Title>

      <Timeline color="yellow" active={1} bulletSize={24} lineWidth={2}>
        <Timeline.Item title="Adramatic loop" bullet={<IconCar size="1rem" />}>
          <Text c="dimmed" size="sm">
            We did a LOOP of
          </Text>
          <List>
            <List.Item>Germany</List.Item>
            <List.Item>Czech Republic</List.Item>
            <List.Item>Austria</List.Item>
            <List.Item>Slovenia</List.Item>
            <List.Item>Italy</List.Item>
            <List.Item>San Marino</List.Item>
            <List.Item>Croatia</List.Item>
            <List.Item>Bosnia and Herzegovina</List.Item>
            <List.Item>Hungary</List.Item>
            <List.Item>Slovakia</List.Item>
          </List>
          <Text size="xs" mt={4}>
            25 June - 7 July 2022
          </Text>
        </Timeline.Item>

        <Timeline.Item
          title="Manchester"
          bullet={<IconBriefcase size="1rem" />}
        >
          <Text c="dimmed" size="sm">
            Christmas market and deciding to live together!
          </Text>
          <List>
            <List.Item>Manchester</List.Item>
          </List>
          <Text size="xs" mt={4}>
            12th December - 14th December 2022
          </Text>
        </Timeline.Item>
      </Timeline>
    </>
  );
}
