import { readFilm } from "@/services/filmlist";
import { FilmListEdit } from "@/components/filmedit";

interface Params {
  id: string;
}

export default async function FilmEditServer({ params }: { params: Params }) {
  const { id } = params;
  const data = await readFilm(id);

  return <FilmListEdit filmData={data[0]} />;
}
