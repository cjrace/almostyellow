import { pageMetadata } from "@/metadata";
import Header from "@/components/header";
import { Container } from "@mantine/core";
import WhiskyJournal from "@/components/whiskyjournal";

export const metadata = pageMetadata(
  "Whisky Journal",
  "Details, ratings, and ponderings on the whiskies I've tasted.",
);

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Whisky journal", href: "" },
];

export default function WhiskyJournalPage() {
  return (
    <>
      <Header crumbs={crumbitems} />

      <main id="main-content">
        <Container size="lg">
          <WhiskyJournal />
        </Container>
      </main>
    </>
  );
}
