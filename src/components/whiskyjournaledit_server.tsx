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
  const data = await readWhisky(id);

  return <WhiskyJournalEdit whiskyData={data[0]} />;
}
