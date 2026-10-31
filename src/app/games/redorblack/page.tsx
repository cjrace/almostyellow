import RedOrBlack from "@/components/redorblack";
import { Metadata } from "next";
import Header from "@/components/header";

export const metadata: Metadata = {
  title: "Red or Black",
  description: "Guess the colour of the next card. A Ben Palmer original.",
  openGraph: {
    title: "Red or Black | Almost Yellow",
    description: "Guess the colour of the next card. A Ben Palmer original.",
  },
};

export default function RedOrBlackPage() {
  return (
    <>
      <Header noCrumbs={true} game={true} />

      <main id="main-content">
        <RedOrBlack />
      </main>
    </>
  );
}
