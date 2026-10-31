import WhiskyJournalEditServer from "@/components/whiskyjournaledit_server";
import Header from "@/components/header";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit whisky",
};

export default async function WhiskyJournalEditPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const { id } = params;

  // Ensure the component only renders when the id is available and is a string
  if (!id || Array.isArray(id)) {
    return null;
  }

  return (
    <>
      <Header noCrumbs={true} whiskyJournal={true} />
      <main id="main-content">
        <WhiskyJournalEditServer params={{ id }} />
      </main>
    </>
  );
}
