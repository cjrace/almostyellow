import { Breadcrumbs, Anchor } from "@mantine/core";
import Cocktails from "@/components/cocktails";
import BackToTop from "@/components/backtotop";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cocktails",
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Cocktails", href: "" },
].map((item, index) => (
  <Anchor href={item.href} key={index}>
    {item.title}
  </Anchor>
));

export default function CocktailsPage() {
  return (
    <>
      <Breadcrumbs>{crumbitems}</Breadcrumbs>

      <h1>Cocktails</h1>

      <Cocktails />
      <BackToTop />
    </>
  );
}
