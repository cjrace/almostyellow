import { Space, Title } from "@mantine/core";
import BoomBoomPirate from "@/components/boomboompirate";
import { pageMetadata } from "@/metadata";
import Header from "@/components/header";

export const metadata = pageMetadata(
  "Boom Boom Pirate",
  "Pull the right ropes or things will go boom!",
);

export default function BoomBoomPiratePage() {
  return (
    <>
      <Header noCrumbs={true} game={true} />

      <main id="main-content">
        <Title>Boom Boom Pirate</Title>
        <Space h="xl" />
        <BoomBoomPirate />
      </main>
    </>
  );
}
