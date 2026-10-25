import { notFound } from "next/navigation";
import { readFilm } from "@/services/filmlist";
import { FilmListEdit } from "@/components/filmedit";

interface Params {
  id: string;
}

export default async function FilmEditServer({ params }: { params: Params }) {
  const { id } = params;
  const film = await readFilm(id);
  if (!film) notFound();

  return <FilmListEdit filmData={film} />;
}
