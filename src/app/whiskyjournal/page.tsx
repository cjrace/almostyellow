import { pageMetadata } from "@/metadata";
import Header from "@/components/header";
import { Container } from "@mantine/core";
import WhiskyJournal from "@/components/whiskyjournal";
import { connection } from "next/server";
import { readWhiskyJournal } from "@/services/whiskyjournal";

export const metadata = pageMetadata(
  "Whisky Journal",
  "Details, ratings, and ponderings on the whiskies I've tasted.",
);

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Whisky journal", href: "" },
];

export default async function WhiskyJournalPage() {
  // Read the journal on each request, so changes show without a rebuild
  await connection();
  const whiskies = await readWhiskyJournal();

  return (
    <>
      <Header crumbs={crumbitems} />

      <main id="main-content">
        <Container size="lg">
          <WhiskyJournal whiskies={whiskies} />
        </Container>
      </main>
    </>
  );
}
