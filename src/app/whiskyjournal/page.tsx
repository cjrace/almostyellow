import { Metadata } from "next";
import Header from "@/components/header";
import { Container, Title } from "@mantine/core";
import WhiskyJournal from "@/components/whiskyjournal";

export const metadata: Metadata = {
  title: "Whisky Journal",
  description: "Details, ratings and ponderings on the whiskies I've tasted.",
  openGraph: {
    title: "Whisky Journal | Almost Yellow",
    description: "Details, ratings and ponderings on the whiskies I've tasted.",
  },
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Whisky Journal", href: "" },
];

export default function WhiskyJournalPage() {
  return (
    <>
      <Header crumbs={crumbitems} />

      <main id="main-content">
        <Container size="lg">
          <Title>Cam&apos;s Whisky Journal</Title>
          <WhiskyJournal />
        </Container>
      </main>
    </>
  );
}
