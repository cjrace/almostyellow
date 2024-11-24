import { Metadata } from "next";
import Header from "@/components/header";
import { Container } from "@mantine/core";
import { WhiskyJournalAdd } from "@/components/whiskyjournaladd";

export const metadata: Metadata = {
  title: "Add Whisky",
};

const crumbitems = [
  { title: "Whisky Journal", href: "/whiskyjournal" },
  { title: "Add Whisky", href: "" },
];

export default async function AddWhisky() {
  return (
    <>
      <Header crumbs={crumbitems} />

      <main id="main-content">
        <Container size="lg">
          <WhiskyJournalAdd />
        </Container>
      </main>
    </>
  );
}
