import FilmEditServer from "@/components/filmedit_server";
import Header from "@/components/header";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit film",
};

export default async function FilmEditPage(props: {
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
      <Header noCrumbs={true} filmList={true} />
      <FilmEditServer params={{ id }} />
    </>
  );
}
