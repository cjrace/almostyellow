import { notFound } from "next/navigation";
import { readWhisky } from "@/services/whiskyjournal";
import { WhiskyJournalEdit } from "@/components/whiskyjournaledit";

interface Params {
  id: string;
}

export default async function WhiskyJournalEditServer({
  params,
}: {
  params: Params;
}) {
  const { id } = params;
  const whisky = await readWhisky(id);
  if (!whisky) notFound();

  return <WhiskyJournalEdit whiskyData={whisky} />;
}
