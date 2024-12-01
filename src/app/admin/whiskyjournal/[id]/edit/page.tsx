"use client";

import { WhiskyJournalEdit } from "@/components/whiskyjournaledit";
import Header from "@/components/header";
import { useParams } from "next/navigation";

// Work out how to grab the ID and pass into the edit function
export default function WhiskyJournalEditPage() {
  const params = useParams();
  const { id } = params;

  // Ensure the component only renders when the id is available and is a string
  if (!id || Array.isArray(id)) {
    return null;
  }

  return (
    <>
      <Header
        noCrumbs={true} /* TODO: Need to add back to whisky journal button */
      />
      <WhiskyJournalEdit whiskyId={id} />
    </>
  );
}
