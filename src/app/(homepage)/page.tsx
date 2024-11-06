"use client";

import Script from "next/script";
import { Button, Group, Grid } from "@mantine/core";
import Confetti from "@/components/confetti";
import {
  IconDeviceGamepad2,
  IconMoodPuzzled,
  IconCheese,
  IconGlassCocktail,
  IconBeach,
  IconPaperclip,
  IconBrandGithub,
} from "@tabler/icons-react";

export default function Home() {
  return (
    <div>
      <Grid justify="center">
        <Grid.Col>
          <h1 style={{ textAlign: "center" }}>Almost yellow</h1>
          <p style={{ textAlign: "center" }}>
            This is our homepage, we should make it prettier.
          </p>

          <Group justify="center">
            <Script
              async
              data-trigger="custom"
              src="https://run.confettipage.com/here.js"
              data-confetticode="U2FsdGVkX1+CNcJBzcKLJOKIu6YhgT7XjghTb+IWZHSoogELCwoPC/PUZQIW5u3G1VPa5AP+lxJTvkyENTZzRSJPTJJjB+0knZVwSPBUprdUZugMFu7o+b3Qvrt+TXJfl4nEnE86Hd2i4D/bFcHE8GHx/ZETOTUJKXBV88gGyUzWrijXvtrbArWtm1at4XdI/peCfOf+3SdC05Esnhb9gC1UVA74FF4Yjn6mHdEFuEGstzuTibqvVRG3n0J9cbj6/euOgd0566CT59EhfLGcBudSqal7p2d4Dwgt3tOU6KLv/+sBWg0gwc8dDl+2nTTmJoE6U/sL/3Qn1EmiHOvQ1dY1dhHItHHcizSsG6+IRX0SRvZ6X6e9qonsFF9IMWmeMDrtEG9tUwV0//GsBuqp13oNETU36j6ep7ZiK+9M6uJfQqsZegVdvzpPyllQ+5wwWDenjR27jowVP1pWGgHcK5O99xHBYGoqm+xWiX0LaXZ9fhmrGbYw0kVS2SpbvyjBDn3MKxc5N/p5B7Jv2lx9B94xVsiAU0P3GXCxqoFncFDI63txMjvQ9+2uFEApqXuyS2UYDH1ltKAbubpcia/A7Z3wos5QoomZjI8GK3YCrvBjHRV7/Q6cL0CqBMoeOPaMIWNH83nEOYEz1c8pPCF7Oii/Dn8+4yTebsWPpS4YAlSA7pcneoaEhntjFJm8IjHV"
            ></Script>

            <Confetti />
          </Group>
        </Grid.Col>

        <Grid.Col>
          <Group justify="center">
            <Button
              leftSection={<IconDeviceGamepad2 />}
              variant="default"
              component="a"
              size="xl"
              href="/games"
            >
              View our games
            </Button>

            <Button
              leftSection={<IconMoodPuzzled />}
              variant="default"
              component="a"
              size="xl"
              href="/decisionmaker"
            >
              How we make decisions
            </Button>

            <Button
              leftSection={<IconCheese />}
              variant="default"
              component="a"
              size="xl"
              href="/recipes"
            >
              Our recipes
            </Button>

            <Button
              leftSection={<IconGlassCocktail />}
              variant="default"
              component="a"
              size="xl"
              href="/cocktails"
            >
              Cocktail time!
            </Button>

            <Button
              leftSection={<IconBeach />}
              variant="default"
              component="a"
              size="xl"
              href="/holidays"
            >
              Our holidays!
            </Button>

            <Button
              leftSection={<IconPaperclip />}
              variant="default"
              component="a"
              size="xl"
              href="/admin"
            >
              Admin stuff
            </Button>

            <Button
              leftSection={<IconBrandGithub />}
              target="_blank"
              variant="default"
              rel="noopener noreferrer"
              component="a"
              size="xl"
              href="https://github.com/cjrace/almostyellow"
            >
              Source code
            </Button>
          </Group>
        </Grid.Col>
      </Grid>
    </div>
  );
}
