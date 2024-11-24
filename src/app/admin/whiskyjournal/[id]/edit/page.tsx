import { Metadata } from "next";
import { WhiskyJournalEdit } from "@/components/whiskyjournaledit";
import Header from "@/components/header";

export const metadata: Metadata = {
  title: "Edit or delete whisky",
};

// Work out how to grab the ID and pass into the edit function
export default async function WhiskyJournalEditPage() {
  return (
    <>
      <Header noCrumbs={true} />
      {/* TODO: Need to add back to whisky journal button */}
      <WhiskyJournalEdit />
    </>
  );
}
