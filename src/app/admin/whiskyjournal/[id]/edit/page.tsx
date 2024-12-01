import WhiskyJournalEditServer from "@/components/whiskyjournaledit_server";
import Header from "@/components/header";

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
      <Header
        noCrumbs={true} /* TODO: Need to add back to whisky journal button */
      />
      <WhiskyJournalEditServer params={{ id }} />
    </>
  );
}
