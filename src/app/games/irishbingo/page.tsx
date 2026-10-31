import IrishBingo from "@/components/irishbingo";
import { pageMetadata } from "@/metadata";
import Header from "@/components/header";

export const metadata = pageMetadata(
  "Irish Bingo",
  "The most fun you can have with a pack of cards.",
);

export default function IrishBingoPage() {
  return (
    <>
      <Header noCrumbs={true} game={true} />

      <main id="main-content">
        <IrishBingo />
      </main>
    </>
  );
}
