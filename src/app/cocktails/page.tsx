import Cocktails from "@/components/cocktails";
import BackToTop from "@/components/backtotop";
import { Metadata } from "next";
import Header from "@/components/header";

export const metadata: Metadata = {
  title: "Cocktails",
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Cocktails", href: "" },
];

export default function CocktailsPage() {
  return (
    <>
      <Header crumbs={crumbitems} />

      <h1>Cocktails</h1>

      <Cocktails />
      <BackToTop />
    </>
  );
}
