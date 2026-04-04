import { Metadata } from "next";
import Header from "@/components/header";
import { Container } from "@mantine/core";
import { WhiskyJournalAdd } from "@/components/whiskyjournaladd";

export const metadata: Metadata = {
  title: "Add Whisky",
};

export default function AddWhisky() {
  return (
    <>
      <Header noCrumbs={true} whiskyJournal={true} />

      <main id="main-content">
        <Container size="lg">
          <WhiskyJournalAdd />
        </Container>
      </main>
    </>
  );
}
