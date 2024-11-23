"use client";

import { whiskyData, WhiskyCard } from "@/components/whiskycard";
import { Container } from "@mantine/core";

export default function WhiskyJournal() {
  return (
    <Container mt="xl">
      {whiskyData.map((whisky) => (
        <div key={whisky.whisky_id}>
          <WhiskyCard {...whisky} />
        </div>
      ))}
    </Container>
  );
}
