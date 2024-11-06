"use client";

import { Text, Timeline, Breadcrumbs, Anchor, Grid } from "@mantine/core";
import BackToTop from "@/components/backtotop";
import {
  IconSun,
  IconShip,
  IconSnowflake,
  IconCar,
  IconGift,
  IconMoodSurprised,
  IconBriefcase,
} from "@tabler/icons-react";

// View more icons at https://tabler.io/icons?form=MG0AV3 //

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Holidays", href: "" },
].map((item, index) => (
  <Anchor href={item.href} key={index}>
    {item.title}
  </Anchor>
));

export default function HolidaysPage() {
  return (
    <div>
      <Breadcrumbs>{crumbitems}</Breadcrumbs>

      <Grid>
        <h1>Our trips and holidays</h1>

        <Grid.Col>
          <h2>2022</h2>

          <Timeline color="yellow" active={1} bulletSize={24} lineWidth={2}>
            <Timeline.Item
              title="Adramatic loop"
              bullet={<IconCar size="1rem" />}
            >
              <Text c="dimmed" size="sm">
                We did a LOOP of
              </Text>
              <ul>
                <li>Germany</li>
                <li>Czech Republic</li>
                <li>Austria</li>
                <li>Slovenia</li>
                <li>Italy</li>
                <li>San Marino</li>
                <li>Croatia</li>
                <li>Bosnia and Herzegovina</li>
                <li>Hungary</li>
                <li>Slovakia</li>
              </ul>
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
              <ul>
                <li>Manchester</li>
              </ul>
              <Text size="xs" mt={4}>
                12th December - 14th December 2022
              </Text>
            </Timeline.Item>
          </Timeline>

          <h2>2023</h2>

          <Timeline color="yellow" active={4} bulletSize={24} lineWidth={2}>
            <Timeline.Item
              title="Sparkly sky"
              bullet={<IconSnowflake size="1rem" />}
            >
              <Text c="dimmed" size="sm">
                Man chop wood in the arctic circle
              </Text>
              <ul>
                <li>Lofoten, Norway</li>
              </ul>
              <Text size="xs" mt={4}>
                3rd January - 8th January 2023
              </Text>
            </Timeline.Item>

            <Timeline.Item
              title="North coast 500"
              bullet={<IconCar size="1rem" />}
            >
              <Text c="dimmed" size="sm">
                A Scottish loop this time
              </Text>
              <ul>
                <li>Scotland</li>
              </ul>
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
              <ul>
                <li>Catgill farm, Skipton</li>
              </ul>
              <Text size="xs" mt={4}>
                9th July - 10th July 2023
              </Text>
            </Timeline.Item>

            <Timeline.Item
              title="Cam's birthday"
              bullet={<IconGift size="1rem" />}
            >
              <Text c="dimmed" size="sm">
                Being impeccable piggies
              </Text>
              <ul>
                <li>The impeccable pig, Sedgefield</li>
              </ul>
              <Text size="xs" mt={4}>
                7th August - 8th August 2023
              </Text>
            </Timeline.Item>

            <Timeline.Item title="Gr-EES" bullet={<IconSun size="1rem" />}>
              <Text c="dimmed" size="sm">
                Our first all inclusive
              </Text>
              <ul>
                <li>Kos, Greece</li>
              </ul>
              <Text size="xs" mt={4}>
                6th September - 10th September 2023
              </Text>
            </Timeline.Item>
          </Timeline>

          <h2>2024</h2>

          <Timeline color="yellow" active={5} bulletSize={24} lineWidth={2}>
            <Timeline.Item
              title="Christmas Schtarshh"
              bullet={<IconGift size="1rem" />}
            >
              <Text c="dimmed" size="sm">
                No stars but kitchen roll kebabs
              </Text>
              <ul>
                <li>Wild Northumberland glamping, Hexham</li>
              </ul>
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
              <ul>
                <li>Neath</li>
                <li>Bristol</li>
                <li>Bath</li>
              </ul>
              <Text size="xs" mt={4}>
                15th March - 16th March 2024
              </Text>
            </Timeline.Item>

            <Timeline.Item title="Bulgaria" bullet={<IconSun size="1rem" />}>
              <Text c="dimmed" size="sm">
                Being fancy with the old leathery people
              </Text>
              <ul>
                <li>Sunny beach, Bulgaria</li>
              </ul>
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
              <ul>
                <li>Lebberston</li>
              </ul>
              <Text size="xs" mt={4}>
                7th July - 9th July 2024
              </Text>
            </Timeline.Item>

            <Timeline.Item
              title="Cam's birthday"
              bullet={<IconGift size="1rem" />}
            >
              <Text c="dimmed" size="sm">
                Bottomless brunch, batting cage and escape room
              </Text>
              <ul>
                <li>York</li>
              </ul>
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
              <ul>
                <li>Lindisfarne (Holy Island)</li>
              </ul>
              <Text size="xs" mt={4}>
                27th September - 29th September 2024
              </Text>
            </Timeline.Item>

            <Timeline.Item title="CROOOOSMAS" bullet={<IconShip size="1rem" />}>
              <Text c="dimmed" size="sm">
                Cruisin&apos; the Christmas markets in
              </Text>
              <ul>
                <li>Zeebrugge, Belgium</li>
                <li>Amsterdam, Netherlands</li>
              </ul>
              <Text size="xs" mt={4}>
                14 December - 19 December 2024
              </Text>
            </Timeline.Item>
          </Timeline>

          <BackToTop />
        </Grid.Col>
      </Grid>
    </div>
  );
}
